import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreEvent } from '../entities/event.entity';
import { RedisCacheService } from '../redis/redis-cache.service';

const EVENT_TYPES = [
  'page_view',
  'add_to_cart',
  'remove_from_cart',
  'checkout_started',
  'purchase',
] as const;

function startOfDayUtc(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfIsoWeekUtc(now: Date): Date {
  const day = now.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export interface OverviewResponse {
  revenue: { today: number; week: number; month: number };
  events_by_type: Record<string, number>;
  conversion_rate: number | null;
}

export interface TopProductRow {
  product_id: string;
  revenue: number;
}

export interface RecentEventRow {
  event_id: string;
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

@Injectable()
export class AnalyticsService {
  private readonly overviewTtlSec = 45;

  constructor(
    @InjectRepository(StoreEvent)
    private readonly events: Repository<StoreEvent>,
    private readonly cache: RedisCacheService,
  ) {}

  async getOverview(storeId: string): Promise<OverviewResponse> {
    const cacheKey = `overview:${storeId}`;
    if (this.cache.enabled()) {
      const raw = await this.cache.get(cacheKey);
      if (raw) {
        try {
          return JSON.parse(raw) as OverviewResponse;
        } catch {
          /* fall through */
        }
      }
    }

    const now = new Date();
    const todayStart = startOfDayUtc(now);
    const weekStart = startOfIsoWeekUtc(now);
    const monthStart = startOfMonthUtc(now);

    const [todayRev, weekRev, monthRev] = await Promise.all([
      this.sumRevenue(storeId, todayStart, now),
      this.sumRevenue(storeId, weekStart, now),
      this.sumRevenue(storeId, monthStart, now),
    ]);

    const typeRows = await this.events
      .createQueryBuilder('e')
      .select('e.event_type', 'event_type')
      .addSelect('COUNT(*)', 'count')
      .where('e.store_id = :storeId', { storeId })
      .groupBy('e.event_type')
      .getRawMany<{ event_type: string; count: string }>();

    const events_by_type: Record<string, number> = {};
    for (const t of EVENT_TYPES) events_by_type[t] = 0;
    for (const row of typeRows) {
      events_by_type[row.event_type] = Number(row.count);
    }

    const pv = events_by_type.page_view ?? 0;
    const pu = events_by_type.purchase ?? 0;
    /** Raw ratio can exceed 1 if purchases outnumber recorded page views; cap for a sensible rate. */
    const conversion_rate = pv === 0 ? null : Math.min(1, pu / pv);

    const body: OverviewResponse = {
      revenue: {
        today: todayRev,
        week: weekRev,
        month: monthRev,
      },
      events_by_type,
      conversion_rate,
    };

    if (this.cache.enabled()) {
      await this.cache.setex(
        cacheKey,
        this.overviewTtlSec,
        JSON.stringify(body),
      );
    }

    return body;
  }

  private async sumRevenue(
    storeId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const raw = await this.events
      .createQueryBuilder('e')
      .select(
        `COALESCE(SUM((e.data->>'amount')::numeric), 0)`,
        'sum',
      )
      .where('e.store_id = :storeId', { storeId })
      .andWhere("e.event_type = 'purchase'")
      .andWhere('e.timestamp >= :start', { start })
      .andWhere('e.timestamp <= :end', { end })
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  async getTopProducts(storeId: string): Promise<TopProductRow[]> {
    const rows = await this.events
      .createQueryBuilder('e')
      .select(`e.data->>'product_id'`, 'product_id')
      .addSelect(
        `COALESCE(SUM((e.data->>'amount')::numeric), 0)`,
        'revenue',
      )
      .where('e.store_id = :storeId', { storeId })
      .andWhere("e.event_type = 'purchase'")
      .andWhere(`e.data->>'product_id' IS NOT NULL`)
      .groupBy(`e.data->>'product_id'`)
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany<{ product_id: string; revenue: string }>();

    return rows.map((r) => ({
      product_id: r.product_id,
      revenue: Number(r.revenue),
    }));
  }

  async getRecentActivity(
    storeId: string,
    limit: number,
  ): Promise<RecentEventRow[]> {
    const rows = await this.events.find({
      where: { store_id: storeId },
      order: { timestamp: 'DESC' },
      take: limit,
      select: ['event_id', 'event_type', 'timestamp', 'data'],
    });
    return rows.map((r) => ({
      event_id: r.event_id,
      event_type: r.event_type,
      timestamp: r.timestamp.toISOString(),
      data: r.data ?? {},
    }));
  }
}

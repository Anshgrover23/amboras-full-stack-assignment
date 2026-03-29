import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly log = new Logger(RedisCacheService.name);
  private client: Redis | null = null;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    if (url) {
      this.client = new Redis(url, { maxRetriesPerRequest: 2 });
      this.client.on('error', (err) =>
        this.log.warn(`Redis error: ${err.message}`),
      );
    }
  }

  enabled(): boolean {
    return this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async setex(key: string, ttlSec: number, value: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, ttlSec, value);
    } catch {
      /* ignore */
    }
  }

  onModuleDestroy() {
    void this.client?.quit();
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { CurrentStoreId } from './current-user.decorator';
import { RecentActivityQueryDto } from './dto/recent-activity-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  getOverview(@CurrentStoreId() storeId: string) {
    return this.analytics.getOverview(storeId);
  }

  @Get('top-products')
  getTopProducts(@CurrentStoreId() storeId: string) {
    return this.analytics.getTopProducts(storeId);
  }

  @Get('recent-activity')
  getRecentActivity(
    @CurrentStoreId() storeId: string,
    @Query() query: RecentActivityQueryDto,
  ) {
    const limit = query.limit ?? 20;
    return this.analytics.getRecentActivity(storeId, limit);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { StoreEvent } from '../entities/event.entity';
import { RedisCacheService } from '../redis/redis-cache.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([StoreEvent]), AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RedisCacheService],
})
export class AnalyticsModule {}

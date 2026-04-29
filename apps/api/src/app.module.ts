import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { RegionsModule } from './modules/regions/regions.module';
import { DistrictsModule } from './modules/districts/districts.module';
import { SubwaysModule } from './modules/subways/subways.module';
import { BuildersModule } from './modules/builders/builders.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { ListingsModule } from './modules/listings/listings.module';
import { RequestsModule } from './modules/requests/requests.module';
import { ContentModule } from './modules/content/content.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { FeedImportModule } from './modules/feed-import/feed-import.module';
import { StatsModule } from './modules/stats/stats.module';
import { NewsModule } from './modules/news/news.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { SearchModule } from './modules/search/search.module';
import { MediaModule } from './modules/media/media.module';
import { CacheModule } from './common/cache/cache.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { PresentationsModule } from './modules/presentations/presentations.module';
import { SellersModule } from './modules/sellers/sellers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    SentryModule.forRoot(),
    MonitoringModule,
    CacheModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    RegionsModule,
    DistrictsModule,
    SubwaysModule,
    BuildersModule,
    ReferenceModule,
    BlocksModule,
    BuildingsModule,
    ListingsModule,
    RequestsModule,
    ContentModule,
    UsersModule,
    AuditModule,
    FeedImportModule,
    StatsModule,
    NewsModule,
    FavoritesModule,
    CollectionsModule,
    SearchModule,
    MediaModule,
    PresentationsModule,
    SellersModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }],
})
export class AppModule {}

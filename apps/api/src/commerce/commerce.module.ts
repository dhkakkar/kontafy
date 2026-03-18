import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';
import { CommerceProcessor } from './commerce.processor';
import { AmazonAdapter } from './adapters/amazon.adapter';
import { FlipkartAdapter } from './adapters/flipkart.adapter';
import { ShopifyAdapter } from './adapters/shopify.adapter';
import { WooCommerceAdapter } from './adapters/woocommerce.adapter';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', undefined),
          maxRetriesPerRequest: null,
        },
      } as any),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'commerce-sync',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30_000,
        },
      },
    }),
  ],
  controllers: [CommerceController],
  providers: [
    CommerceService,
    CommerceProcessor,
    AmazonAdapter,
    FlipkartAdapter,
    ShopifyAdapter,
    WooCommerceAdapter,
  ],
  exports: [CommerceService],
})
export class CommerceModule {}

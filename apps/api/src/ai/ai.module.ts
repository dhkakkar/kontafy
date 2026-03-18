import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProcessor } from './ai.processor';
import { OpenAiService } from './openai.service';

@Module({
  imports: [
    ConfigModule,
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
      name: 'ai',
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiProcessor, OpenAiService],
  exports: [AiService, OpenAiService],
})
export class AiModule implements OnModuleInit {
  private readonly logger = new Logger(AiModule.name);

  constructor(@InjectQueue('ai') private readonly aiQueue: Queue) {}

  async onModuleInit() {
    try {
      // Register repeatable cron jobs

      // Daily forecast refresh at 6:00 AM
      await this.aiQueue.add(
        'daily-forecast',
        { type: 'forecast' },
        {
          repeat: { cron: '0 6 * * *' } as any,
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      // Daily anomaly scan at 7:00 AM
      await this.aiQueue.add(
        'daily-anomalies',
        { type: 'anomalies' },
        {
          repeat: { cron: '0 7 * * *' } as any,
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      // Weekly insights generation on Monday at 8:00 AM
      await this.aiQueue.add(
        'weekly-insights',
        { type: 'insights' },
        {
          repeat: { cron: '0 8 * * 1' } as any,
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log('AI cron jobs registered (forecast 6AM, anomalies 7AM, insights Mon 8AM)');
    } catch (err) {
      this.logger.warn('Failed to register AI cron jobs — skipping', err);
    }
  }
}

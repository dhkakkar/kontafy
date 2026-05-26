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
      useFactory: (configService: ConfigService) => {
        // Resolve host/port from REDIS_URL first because that's what
        // docker-compose sets; fall back to REDIS_HOST/PORT for local
        // dev. ioredis's connection options take host/port (not a `url`
        // field), so we parse the URL ourselves. Cap maxRetriesPerRequest
        // so a misconfigured Redis fails fast — without this, ioredis
        // retries forever and Nest's onModuleInit hangs past
        // 'Database connection established', never reaching app.listen().
        const redisUrl = configService.get<string>('REDIS_URL');
        let host = configService.get<string>('REDIS_HOST', 'redis');
        let port = configService.get<number>('REDIS_PORT', 6379);
        let password = configService.get<string>('REDIS_PASSWORD');
        if (redisUrl) {
          try {
            const u = new URL(redisUrl);
            if (u.hostname) host = u.hostname;
            if (u.port) port = Number(u.port);
            if (u.password) password = u.password;
          } catch {
            // Malformed REDIS_URL — stick with the host/port defaults.
          }
        }
        return {
          connection: {
            host,
            port,
            password: password || undefined,
            maxRetriesPerRequest: 3,
          },
        } as any;
      },
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
    // BullMQ v5 renamed RepeatOptions.cron → RepeatOptions.pattern. Passing
    // the old { cron } field made aiQueue.add() hang indefinitely inside
    // Nest's onModuleInit, which in turn blocked app.listen() from ever
    // running and left the API never binding port 5002. The fix is to
    // use { pattern } and to wrap each add in a hard timeout so any future
    // bull oddity can't take the whole boot down with it.
    const withTimeout = <T>(
      label: string,
      op: () => Promise<T>,
      ms = 5000,
    ): Promise<T | null> =>
      Promise.race([
        op(),
        new Promise<null>((resolve) => {
          setTimeout(() => {
            this.logger.warn(`${label} timed out after ${ms}ms — skipping`);
            resolve(null);
          }, ms);
        }),
      ]);

    try {
      await withTimeout('daily-forecast', () =>
        this.aiQueue.add(
          'daily-forecast',
          { type: 'forecast' },
          {
            repeat: { pattern: '0 6 * * *' },
            removeOnComplete: 10,
            removeOnFail: 5,
          },
        ),
      );
      await withTimeout('daily-anomalies', () =>
        this.aiQueue.add(
          'daily-anomalies',
          { type: 'anomalies' },
          {
            repeat: { pattern: '0 7 * * *' },
            removeOnComplete: 10,
            removeOnFail: 5,
          },
        ),
      );
      await withTimeout('weekly-insights', () =>
        this.aiQueue.add(
          'weekly-insights',
          { type: 'insights' },
          {
            repeat: { pattern: '0 8 * * 1' },
            removeOnComplete: 10,
            removeOnFail: 5,
          },
        ),
      );

      this.logger.log(
        'AI cron jobs registered (forecast 6AM, anomalies 7AM, insights Mon 8AM)',
      );
    } catch (err) {
      this.logger.warn('Failed to register AI cron jobs — skipping', err);
    }
  }
}

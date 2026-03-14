import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

interface WhatsAppJobData {
  messageId: string;
  phone: string;
  message: string;
  pdfUrl?: string;
  orgId: string;
}

@Injectable()
export class WhatsAppProcessor {
  private readonly logger = new Logger(WhatsAppProcessor.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
  ) {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.worker = new Worker(
      'whatsapp',
      async (job: Job<WhatsAppJobData>) => {
        return this.processJob(job);
      },
      {
        connection: { host: redisHost, port: redisPort },
        concurrency: 5,
        limiter: {
          max: 30,
          duration: 60000, // 30 messages per minute rate limit
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} (${job.name}) completed`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} (${job?.name}) failed: ${error.message}`);
    });

    this.logger.log('WhatsApp queue processor started');
  }

  private async processJob(job: Job<WhatsAppJobData>) {
    const { messageId, phone, message, pdfUrl } = job.data;

    this.logger.log(`Processing ${job.name} job ${job.id} for ${phone}`);

    try {
      // Update status to 'sent' (attempting)
      await this.prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: { status: 'sent', sent_at: new Date() },
      });

      // Send via WhatsApp provider
      const result = await this.whatsappService.sendViaProvider(
        phone,
        message,
        pdfUrl || undefined,
      );

      // Store provider message ID for webhook tracking
      await this.prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: { provider_message_id: result.providerMessageId },
      });

      this.logger.log(
        `Message ${messageId} sent successfully. Provider ID: ${result.providerMessageId}`,
      );

      return { success: true, providerMessageId: result.providerMessageId };
    } catch (error) {
      this.logger.error(`Failed to send message ${messageId}: ${error.message}`);

      // Mark as failed if all retries exhausted
      const isLastAttempt = job.attemptsMade >= (job.opts?.attempts ?? 3) - 1;
      if (isLastAttempt) {
        await this.prisma.whatsAppMessage.update({
          where: { id: messageId },
          data: {
            status: 'failed',
            error: error.message,
          },
        });
      }

      throw error; // Re-throw so BullMQ handles retry
    }
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}

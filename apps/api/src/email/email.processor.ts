import { Processor } from "@nestjs/bull";
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, EmailPayload } from './email.service';

@Processor('email')
export class EmailProcessor  {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmailPayload & { emailLogId: string }>): Promise<void> {
    const { emailLogId, ...payload } = job.data;

    this.logger.log(`Processing email job ${job.id} — ${payload.type} to ${payload.to}`);

    try {
      // Reconstruct attachments from base64 if needed
      const processedPayload: EmailPayload = {
        ...payload,
        attachments: payload.attachments?.map((a: any) => ({
          ...a,
          content: a.encoding === 'base64' ? Buffer.from(a.content, 'base64') : a.content,
        })),
      };

      await this.emailService.sendMail(processedPayload);

      // Update email log to sent
      await this.prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: 'sent',
          sent_at: new Date(),
        },
      });

      this.logger.log(`Email job ${job.id} completed — sent to ${payload.to}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email job ${job.id} failed: ${errorMessage}`, error);

      // Update email log with error
      await this.prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: 'failed',
          error: errorMessage,
        },
      });

      // Rethrow so BullMQ can retry
      throw error;
    }
  }
}

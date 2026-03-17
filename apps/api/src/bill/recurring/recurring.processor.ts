import { Processor } from "@nestjs/bull";
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RecurringService } from './recurring.service';

@Processor('recurring-invoices')
export class RecurringProcessor  {
  private readonly logger = new Logger(RecurringProcessor.name);

  constructor(private readonly recurringService: RecurringService) {
    super();
  }

  /**
   * Process the daily recurring invoice generation job.
   * This job is scheduled as a BullMQ cron repeatable job (daily at 01:00 AM).
   */
  async process(job: Job<{ triggeredAt: string }>): Promise<void> {
    this.logger.log(
      `Processing recurring invoices job ${job.id} — triggered at ${job.data.triggeredAt}`,
    );

    try {
      const count = await this.recurringService.processDueRecurringInvoices();
      this.logger.log(
        `Recurring invoices job ${job.id} completed — generated ${count} invoices`,
      );
    } catch (error) {
      this.logger.error(
        `Recurring invoices job ${job.id} failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Let BullMQ handle retries
    }
  }
}

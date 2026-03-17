import { Processor } from "@nestjs/bull";
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EInvoiceService } from './einvoice.service';

interface BulkEInvoiceJobData {
  orgId: string;
  invoiceIds: string[];
  batchId: string;
}

@Processor('einvoice')
export class EInvoiceProcessor  {
  private readonly logger = new Logger(EInvoiceProcessor.name);

  constructor(private readonly einvoiceService: EInvoiceService) {
    super();
  }

  async process(job: Job<BulkEInvoiceJobData>): Promise<any> {
    const { orgId, invoiceIds, batchId } = job.data;

    this.logger.log(
      `Processing bulk e-invoice job ${job.id} — batch ${batchId}, ${invoiceIds.length} invoices`,
    );

    const results: Array<{
      invoice_id: string;
      status: 'generated' | 'failed';
      irn: string | null;
      error: string | null;
    }> = [];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < invoiceIds.length; i++) {
      const invoiceId = invoiceIds[i];

      try {
        const result = await this.einvoiceService.generate(orgId, invoiceId);

        if (result.status === 'generated') {
          successCount++;
          results.push({
            invoice_id: invoiceId,
            status: 'generated',
            irn: result.irn,
            error: null,
          });
        } else {
          failCount++;
          results.push({
            invoice_id: invoiceId,
            status: 'failed',
            irn: null,
            error: result.error_message,
          });
        }
      } catch (error) {
        failCount++;
        results.push({
          invoice_id: invoiceId,
          status: 'failed',
          irn: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Update job progress
      await job.updateProgress(Math.round(((i + 1) / invoiceIds.length) * 100));

      // Rate limiting: wait 500ms between requests to NIC
      if (i < invoiceIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    this.logger.log(
      `Bulk e-invoice batch ${batchId} complete: ${successCount} success, ${failCount} failed`,
    );

    return {
      batchId,
      total: invoiceIds.length,
      success: successCount,
      failed: failCount,
      results,
    };
  }
}

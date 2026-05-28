import { Module } from '@nestjs/common';
import { DataTransferController } from './data-transfer.controller';
import { ExportService } from './export.service';
import { ImportService } from './import.service';
import { SalesInvoicesImport } from './runners/sales-invoices.import';
import { BillModule } from '../bill/bill.module';

@Module({
  // BillModule exports InvoicesService — the sales-invoices import
  // delegates per-invoice creation to that service so the GST split,
  // journal posting, and sub-ledger updates stay identical to the
  // manual /invoices/new flow.
  imports: [BillModule],
  controllers: [DataTransferController],
  providers: [ExportService, ImportService, SalesInvoicesImport],
  exports: [ExportService, ImportService],
})
export class DataTransferModule {}

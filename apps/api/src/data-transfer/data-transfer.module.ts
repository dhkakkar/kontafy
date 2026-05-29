import { Module } from '@nestjs/common';
import { DataTransferController } from './data-transfer.controller';
import { ExportService } from './export.service';
import { ImportService } from './import.service';
import { SalesInvoicesImport } from './runners/sales-invoices.import';
import { PurchaseBillsImport } from './runners/purchase-bills.import';
import { PaymentsImport } from './runners/payments.import';
import { ExpensesImport } from './runners/expenses.import';
import { JournalEntriesImport } from './runners/journal-entries.import';
import { BillModule } from '../bill/bill.module';

@Module({
  // BillModule exports InvoicesService + PurchasesService — the
  // transaction-import handlers delegate per-bill / per-invoice
  // creation to those services so the GST split, journal posting,
  // and sub-ledger updates stay identical to the manual forms.
  imports: [BillModule],
  controllers: [DataTransferController],
  providers: [
    ExportService,
    ImportService,
    SalesInvoicesImport,
    PurchaseBillsImport,
    PaymentsImport,
    ExpensesImport,
    JournalEntriesImport,
  ],
  exports: [ExportService, ImportService],
})
export class DataTransferModule {}

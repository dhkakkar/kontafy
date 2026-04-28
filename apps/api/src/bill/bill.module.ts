import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices/invoices.controller';
import { InvoicesService } from './invoices/invoices.service';
import { ContactsController } from './contacts/contacts.controller';
import { ContactsService } from './contacts/contacts.service';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { CreditNotesController } from './credit-notes/credit-notes.controller';
import { CreditNotesService } from './credit-notes/credit-notes.service';
import { PurchasesController } from './purchases/purchases.controller';
import { PurchasesService } from './purchases/purchases.service';
import { RecurringController } from './recurring/recurring.controller';
import { RecurringService } from './recurring/recurring.service';
import { QuotationsController } from './quotations/quotations.controller';
import { QuotationsService } from './quotations/quotations.service';
import { PurchaseOrdersController } from './purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';
import { ExpensesController } from './expenses/expenses.controller';
import { ExpensesService } from './expenses/expenses.service';
import { SalesReturnsController } from './sales-returns/sales-returns.controller';
import { SalesReturnsService } from './sales-returns/sales-returns.service';
import { DeliveryChallansController } from './delivery-challans/delivery-challans.controller';
import { DeliveryChallansService } from './delivery-challans/delivery-challans.service';
import { PdfModule } from './pdf/pdf.module';
import { JournalPostingModule } from '../books/journal-posting/journal-posting.module';

@Module({
  imports: [PdfModule, JournalPostingModule],
  controllers: [
    InvoicesController,
    ContactsController,
    PaymentsController,
    CreditNotesController,
    PurchasesController,
    RecurringController,
    QuotationsController,
    PurchaseOrdersController,
    ExpensesController,
    SalesReturnsController,
    DeliveryChallansController,
  ],
  providers: [
    InvoicesService,
    ContactsService,
    PaymentsService,
    CreditNotesService,
    PurchasesService,
    RecurringService,
    QuotationsService,
    PurchaseOrdersService,
    ExpensesService,
    SalesReturnsService,
    DeliveryChallansService,
  ],
  exports: [
    InvoicesService,
    ContactsService,
    PaymentsService,
    CreditNotesService,
    PurchasesService,
    RecurringService,
    QuotationsService,
    PurchaseOrdersService,
    ExpensesService,
    SalesReturnsService,
    DeliveryChallansService,
    PdfModule,
  ],
})
export class BillModule {}

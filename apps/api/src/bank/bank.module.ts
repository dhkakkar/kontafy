import { Module } from '@nestjs/common';
import { BankAccountsController } from './accounts/bank-accounts.controller';
import { BankAccountsService } from './accounts/bank-accounts.service';
import { BankTransactionsController } from './transactions/bank-transactions.controller';
import { BankTransactionsService } from './transactions/bank-transactions.service';
import { ReconciliationController } from './reconciliation/reconciliation.controller';
import { ReconciliationService } from './reconciliation/reconciliation.service';

@Module({
  controllers: [
    BankAccountsController,
    BankTransactionsController,
    ReconciliationController,
  ],
  providers: [
    BankAccountsService,
    BankTransactionsService,
    ReconciliationService,
  ],
  exports: [BankAccountsService, BankTransactionsService, ReconciliationService],
})
export class BankModule {}

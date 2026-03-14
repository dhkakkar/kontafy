import { Module } from '@nestjs/common';
import { AccountsController } from './accounts/accounts.controller';
import { AccountsService } from './accounts/accounts.service';
import { JournalController } from './journal/journal.controller';
import { JournalService } from './journal/journal.service';
import { LedgerController } from './ledger/ledger.controller';
import { LedgerService } from './ledger/ledger.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';

@Module({
  controllers: [AccountsController, JournalController, LedgerController, ReportsController],
  providers: [AccountsService, JournalService, LedgerService, ReportsService],
  exports: [AccountsService, JournalService, LedgerService, ReportsService],
})
export class BooksModule {}

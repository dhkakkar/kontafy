import { Module } from '@nestjs/common';
import { AccountsController } from './accounts/accounts.controller';
import { AccountsService } from './accounts/accounts.service';
import { JournalController } from './journal/journal.controller';
import { JournalService } from './journal/journal.service';
import { LedgerController } from './ledger/ledger.controller';
import { LedgerService } from './ledger/ledger.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  // OrganizationModule exports OrganizationService whose seedDefaultAccounts
  // owns the default chart definition; the COA "Load Template" endpoint
  // here delegates to it so we don't duplicate the chart in two places.
  imports: [OrganizationModule],
  controllers: [AccountsController, JournalController, LedgerController, ReportsController],
  providers: [AccountsService, JournalService, LedgerService, ReportsService],
  exports: [AccountsService, JournalService, LedgerService, ReportsService],
})
export class BooksModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { BooksModule } from './books/books.module';
import { BillModule } from './bill/bill.module';
import { StockModule } from './stock/stock.module';
import { TaxModule } from './tax/tax.module';
import { BankModule } from './bank/bank.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { ProfileModule } from './profile/profile.module';
import { DataTransferModule } from './data-transfer/data-transfer.module';
import { AiModule } from './ai/ai.module';
import { CaPortalModule } from './ca-portal/ca-portal.module';
import { CommerceModule } from './commerce/commerce.module';
import { EInvoiceModule } from './einvoice/einvoice.module';
import { ReportsModule } from './reports/reports.module';
import { BranchModule } from './branch/branch.module';
import { BudgetModule } from './budget/budget.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { SupportModule } from './support/support.module';
import { HealthController } from './health/health.controller';
import { AuthGuard } from './common/guards/auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    OrganizationModule,
    BooksModule,
    BillModule,
    StockModule,
    TaxModule,
    BankModule,
    WhatsAppModule,
    EmailModule,
    NotificationsModule,
    DashboardModule,
    SettingsModule,
    ProfileModule,
    DataTransferModule,
    AiModule,
    CaPortalModule,
    CommerceModule,
    EInvoiceModule,
    ReportsModule,
    BranchModule,
    BudgetModule,
    SubscriptionModule,
    SuperadminModule,
    SupportModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}

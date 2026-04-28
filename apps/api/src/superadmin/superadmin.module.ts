import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupportModule } from '../support/support.module';
import { OrganizationModule } from '../organization/organization.module';
import { JournalPostingModule } from '../books/journal-posting/journal-posting.module';

@Module({
  imports: [PrismaModule, SupportModule, OrganizationModule, JournalPostingModule],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}

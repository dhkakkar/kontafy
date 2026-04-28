import { Module } from '@nestjs/common';
import { JournalPostingService } from './journal-posting.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [JournalPostingService],
  exports: [JournalPostingService],
})
export class JournalPostingModule {}

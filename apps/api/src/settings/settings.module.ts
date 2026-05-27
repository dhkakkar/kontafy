import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { BooksModule } from '../books/books.module';

@Module({
  // BooksModule exports AccountsService — bank account opening balances
  // need it to auto-create a 1102.NNN sub-ledger per bank and post the
  // opening journal at save time.
  imports: [ConfigModule, BooksModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EInvoiceController } from './einvoice.controller';
import { EInvoiceService } from './einvoice.service';
import { GspService } from './gsp.service';
import { EwayBillService } from './eway-bill.service';
import { EInvoiceProcessor } from './einvoice.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', undefined),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'einvoice',
    }),
  ],
  controllers: [EInvoiceController],
  providers: [EInvoiceService, GspService, EwayBillService, EInvoiceProcessor],
  exports: [EInvoiceService, EwayBillService, GspService],
})
export class EInvoiceModule {}

import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController, PurchasesPdfController } from './pdf.controller';

@Module({
  controllers: [PdfController, PurchasesPdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}

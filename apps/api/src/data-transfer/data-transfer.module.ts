import { Module } from '@nestjs/common';
import { DataTransferController } from './data-transfer.controller';
import { ExportService } from './export.service';
import { ImportService } from './import.service';

@Module({
  controllers: [DataTransferController],
  providers: [ExportService, ImportService],
  exports: [ExportService, ImportService],
})
export class DataTransferModule {}

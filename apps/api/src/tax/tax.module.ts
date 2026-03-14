import { Module } from '@nestjs/common';
import { GstReturnController } from './gst/gst-return.controller';
import { GstReturnService } from './gst/gst-return.service';
import { TdsController } from './tds/tds.controller';
import { TdsService } from './tds/tds.service';

@Module({
  controllers: [GstReturnController, TdsController],
  providers: [GstReturnService, TdsService],
  exports: [GstReturnService, TdsService],
})
export class TaxModule {}

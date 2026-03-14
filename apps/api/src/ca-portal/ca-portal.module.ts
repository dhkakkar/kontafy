import { Module } from '@nestjs/common';
import { CaPortalController } from './ca-portal.controller';
import { CaPortalService } from './ca-portal.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [CaPortalController],
  providers: [CaPortalService],
  exports: [CaPortalService],
})
export class CaPortalModule {}

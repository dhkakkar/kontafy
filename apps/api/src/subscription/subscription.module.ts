import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { RazorpayService } from './razorpay.service';
import { SubscriptionGuard } from './subscription.guard';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, RazorpayService, SubscriptionGuard],
  exports: [SubscriptionService, RazorpayService, SubscriptionGuard],
})
export class SubscriptionModule {}

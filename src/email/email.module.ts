import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailTestController } from './email-test.controller';
import { PublicEmailTestController } from './public-email-test.controller';

@Module({
  controllers: [EmailController, EmailTestController, PublicEmailTestController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

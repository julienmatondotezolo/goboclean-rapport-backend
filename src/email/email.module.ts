import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailTestController } from './email-test.controller';

@Module({
  controllers: [EmailController, EmailTestController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

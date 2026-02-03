import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfModule } from '../pdf/pdf.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PdfModule, EmailModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

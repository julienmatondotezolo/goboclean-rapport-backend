import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { ReportsModule } from './reports/reports.module';
import { PdfModule } from './pdf/pdf.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    ReportsModule,
    PdfModule,
    EmailModule,
    AdminModule,
  ],
})
export class AppModule {}

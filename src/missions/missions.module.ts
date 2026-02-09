import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { ReportsModule } from '../reports/reports.module';
import { ServiceLoggerService } from '../common/services/service-logger.service';

@Module({
  imports: [AuthModule, NotificationsModule, EmailModule, ReportsModule],
  controllers: [MissionsController],
  providers: [MissionsService, ServiceLoggerService],
  exports: [MissionsService],
})
export class MissionsModule {}

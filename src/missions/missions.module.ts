import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MissionsTestController } from './missions-test.controller';
import { PublicMissionsTestController } from './public-missions-test.controller';
import { CreateTestMissionController } from './create-test-mission.controller';
import { SimpleTestController } from './simple-test.controller';
import { MissionsService } from './missions.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { ReportsModule } from '../reports/reports.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { ServiceLoggerService } from '../common/services/service-logger.service';

@Module({
  imports: [AuthModule, NotificationsModule, EmailModule, ReportsModule, MonitoringModule],
  controllers: [MissionsController, MissionsTestController, PublicMissionsTestController, CreateTestMissionController, SimpleTestController],
  providers: [MissionsService, ServiceLoggerService],
  exports: [MissionsService],
})
export class MissionsModule {}

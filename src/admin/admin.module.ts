import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { CompanyController } from './company.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, CompanyController],
  providers: [AdminService],
})
export class AdminModule {}

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { BackendAuthGuard} from '../auth/backend-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('Email')
@Controller('email-test')
@UseGuards(BackendAuthGuard, AdminGuard)
@ApiBearerAuth()
export class EmailTestController {
  constructor(private readonly emailService: EmailService) {}

  @Post('mission-assigned')
  @ApiOperation({ summary: 'Test mission assigned email template' })
  async testMissionAssignedEmail(@Body() body: { to: string }) {
    const { to } = body;
    
    // Mock mission data for testing
    const mockMissionData = {
      id: 'test-mission-123',
      client_first_name: 'Jean',
      client_last_name: 'Dupont',
      client_address: 'Rue de la Paix 123, 1000 Bruxelles',
      client_phone: '+32 471 XX XX XX',
      appointment_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    };

    try {
      await this.emailService.sendMissionAssignedEmail(mockMissionData, [to]);
      return {
        success: true,
        message: `Mission assigned email sent successfully to ${to}`,
        test_data: mockMissionData,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to send mission assigned email: ${error.message}`,
        error: error.message,
        test_data: mockMissionData,
      };
    }
  }

  @Post('completion-email')
  @ApiOperation({ summary: 'Test mission completion email template' })
  async testCompletionEmail(@Body() body: { to: string }) {
    const { to } = body;
    
    // Mock mission data for testing
    const mockMissionData = {
      id: 'test-mission-456',
      client_first_name: 'Marie',
      client_last_name: 'Martin',
      client_address: 'Avenue Louise 456, 1050 Ixelles',
      client_phone: '+32 471 YY YY YY',
      appointment_time: new Date().toISOString(),
    };

    try {
      await this.emailService.sendMissionCompletedEmail(mockMissionData, [to]);
      return {
        success: true,
        message: `Mission completion email sent successfully to ${to}`,
        test_data: mockMissionData,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to send completion email: ${error.message}`,
        error: error.message,
        test_data: mockMissionData,
      };
    }
  }

  @Post('pre-report-email')
  @ApiOperation({ summary: 'Test pre-report email template' })
  async testPreReportEmail(@Body() body: { to: string }) {
    const { to } = body;
    
    // Mock mission data for testing
    const mockMissionData = {
      id: 'test-mission-789',
      client_first_name: 'Pierre',
      client_last_name: 'Dubois',
      client_address: 'Chaussée de Waterloo 789, 1180 Uccle',
      client_phone: '+32 471 ZZ ZZ ZZ',
      appointment_time: new Date().toISOString(),
    };

    try {
      await this.emailService.sendPreReportEmail(mockMissionData, [to]);
      return {
        success: true,
        message: `Pre-report email sent successfully to ${to}`,
        test_data: mockMissionData,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to send pre-report email: ${error.message}`,
        error: error.message,
        test_data: mockMissionData,
      };
    }
  }
}
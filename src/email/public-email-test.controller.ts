import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmailService } from './email.service';

@ApiTags('Email')
@Controller('public-email-test')
export class PublicEmailTestController {
  constructor(private readonly emailService: EmailService) {}

  @Post('smtp-debug')
  @ApiOperation({ summary: 'Debug SMTP connection (no auth required)' })
  async debugSMTP() {
    console.log('🔧 Resend API Debug Info:');
    console.log('API Key:', process.env.RESEND_API_KEY ? '***masked***' : 'NOT SET');
    console.log('From:', process.env.SMTP_FROM);

    try {
      const isConnected = await this.emailService.testConnection();
      return {
        success: isConnected,
        message: isConnected ? 'Resend API connection successful' : 'Resend API connection failed',
        config: {
          from: process.env.SMTP_FROM,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Resend API test failed',
        error: error.message,
        config: {
          from: process.env.SMTP_FROM,
        }
      };
    }
  }

  @Post('test-mission-email')
  @ApiOperation({ summary: 'Test mission email (no auth required)' })
  async testMissionEmail(@Body() body: { to: string }) {
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
      console.log(`📧 Attempting to send mission email to ${to}...`);
      await this.emailService.sendMissionAssignedEmail(mockMissionData, [to]);
      console.log(`✅ Email sent successfully to ${to}`);
      return {
        success: true,
        message: `Mission assigned email sent successfully to ${to}`,
        test_data: mockMissionData,
      };
    } catch (error: any) {
      console.error(`❌ Email send failed:`, error);
      return {
        success: false,
        message: `Failed to send mission assigned email: ${error.message}`,
        error: error.message,
        test_data: mockMissionData,
      };
    }
  }

  @Post('direct-email-test')
  @ApiOperation({ summary: 'Direct Resend API test (no auth required)' })
  async directEmailTest(@Body() body: { to: string }) {
    const { to } = body;
    
    try {
      console.log(`📧 Sending direct test email to ${to}...`);
      
      const resend = (this.emailService as any).resend;
      
      const { data, error } = await resend.emails.send({
        from: process.env.SMTP_FROM,
        to: [to],
        subject: 'Direct Resend API Test from GoBo Clean',
        html: `
          <h1>Direct Resend API Test ✅</h1>
          <p>This email was sent directly using Resend API from the GoBo Clean backend.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>API:</strong> Resend</p>
        `,
      });

      if (error) {
        console.error(`❌ Direct email failed:`, error);
        return {
          success: false,
          message: `Direct email failed: ${error.message}`,
          error: error.message,
        };
      }

      console.log(`✅ Direct email sent successfully. Message ID: ${data?.id}`);
      
      return {
        success: true,
        message: `Direct email sent successfully to ${to}`,
        messageId: data?.id,
        result: data,
      };
    } catch (error: any) {
      console.error(`❌ Direct email failed:`, error);
      return {
        success: false,
        message: `Direct email failed: ${error.message}`,
        error: error.message,
      };
    }
  }
}
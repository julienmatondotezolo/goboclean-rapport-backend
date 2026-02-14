import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { EmailService } from './email.service';

export class SendTestEmailDto {
  @ApiProperty({ description: 'Email address to send test to', example: 'test@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

@ApiTags('Email Test')
@Controller('email/test')
export class EmailTestController {
  private readonly logger = new Logger(EmailTestController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('completion')
  @ApiOperation({ 
    summary: 'Send test completion email with PDF attachment',
    description: 'Sends a test email using the new format: "Goboclean Rapport: Mission terminée — Jean Dupont — #A1B2C3D4"'
  })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or sending failed' })
  async sendTestCompletionEmail(@Body() dto: SendTestEmailDto) {
    const testRecipient = 'emjisolutions@gmail.com';
    this.logger.log(`🚀 Sending test completion email to ${testRecipient} (original request: ${dto.email})`);

    try {
      await this.emailService.sendTestCompletionEmail(testRecipient);
      
      return {
        success: true,
        message: `Test completion email sent to ${testRecipient}`,
        details: {
          subject_format: 'Goboclean Rapport: Mission terminée — Jean Dupont — #A1B2C3D4',
          attachment: 'Rapport-A1B2C3D4.pdf',
          recipient: testRecipient,
          note: `Always sends to emjisolutions@gmail.com for testing (requested: ${dto.email})`,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to send test email: ${error.message}`);
      throw error;
    }
  }
}
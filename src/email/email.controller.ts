import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('Email')
@Controller('email')
@UseGuards(AuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test-connection')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test SMTP connection (admin only)' })
  async testConnection() {
    const isConnected = await this.emailService.testConnection();
    return {
      connected: isConnected,
      message: isConnected ? 'SMTP connection successful' : 'SMTP connection failed',
    };
  }

  @Post('test-send')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send test email (admin only)' })
  async testSend(@Body() body: { to: string; subject?: string }) {
    const { to, subject = 'Test Email from GoBo Clean' } = body;
    
    const mailOptions = {
      from: 'info@goboclean.be',
      to,
      subject,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#064e3b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
</style></head><body>
<div class="header"><h1 style="margin:0">GoBo Clean</h1><p style="margin:8px 0 0">Test Email</p></div>
<div class="content">
  <h2>SMTP Test Successful! ✅</h2>
  <p>This is a test email from the GoBo Clean backend.</p>
  <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  <p>If you received this email, SMTP configuration is working correctly.</p>
  <p>Cordialement,<br><strong>L'équipe GoBo Clean</strong></p>
</div>
</body></html>`,
    };

    try {
      const transporter = (this.emailService as any).transporter;
      const result = await transporter.sendMail(mailOptions);
      return {
        success: true,
        message: `Test email sent successfully to ${to}`,
        messageId: result.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to send test email: ${error.message}`,
        error: error.message,
      };
    }
  }
}
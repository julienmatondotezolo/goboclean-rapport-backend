import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendReportEmailParams {
  to: string;
  clientName: string;
  reportId: string;
  pdfBuffer: Buffer;
  workerName: string;
  address: string;
}

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendReportEmail(params: SendReportEmailParams): Promise<void> {
    const { to, clientName, reportId, pdfBuffer, workerName, address } = params;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'),
      to,
      subject: `Rapport d'intervention - Nettoyage de toiture`,
      html: this.generateEmailTemplate(clientName, reportId, workerName, address),
      attachments: [
        {
          filename: `Rapport-${reportId.slice(0, 8).toUpperCase()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  private generateEmailTemplate(
    clientName: string,
    reportId: string,
    workerName: string,
    address: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .info-box {
      background: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: #0ea5e9;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">GoBo Clean</h1>
    <p style="margin: 10px 0 0 0;">Rapport d'intervention</p>
  </div>
  
  <div class="content">
    <h2>Bonjour ${clientName},</h2>
    
    <p>Nous vous remercions d'avoir fait confiance à <strong>GoBo Clean</strong> pour le nettoyage de votre toiture.</p>
    
    <p>Vous trouverez ci-joint le rapport détaillé de l'intervention réalisée à votre domicile.</p>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>📋 Numéro de rapport:</strong> ${reportId.slice(0, 8).toUpperCase()}</p>
      <p style="margin: 8px 0 0 0;"><strong>👷 Technicien:</strong> ${workerName}</p>
      <p style="margin: 8px 0 0 0;"><strong>📍 Adresse:</strong> ${address}</p>
    </div>
    
    <p>Le rapport comprend:</p>
    <ul>
      <li>Les informations détaillées de l'intervention</li>
      <li>Les photos avant et après le nettoyage</li>
      <li>Les observations techniques de notre équipe</li>
      <li>Vos signatures (technicien et client)</li>
    </ul>
    
    <p>Ce document constitue une preuve de la prestation effectuée et peut être utilisé pour vos dossiers personnels ou d'assurance.</p>
    
    <p style="margin-top: 30px;">
      <strong>Besoin d'un nouveau nettoyage ?</strong><br>
      N'hésitez pas à nous contacter pour planifier votre prochaine intervention.
    </p>
    
    <p>Cordialement,<br><strong>L'équipe GoBo Clean</strong></p>
  </div>
  
  <div class="footer">
    <p><strong>GoBo Clean</strong></p>
    <p>Bruxelles, Belgique</p>
    <p>contact@goboclean.be | +32 471 XX XX XX</p>
    <p style="margin-top: 15px; font-size: 11px;">
      Cet email a été généré automatiquement. Merci de ne pas y répondre directement.
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection successful');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }
}

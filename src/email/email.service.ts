import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendReportEmailParams {
  to: string;
  clientName: string;
  reportId: string;
  pdfBuffer: Buffer;
  workerName: string;
  address: string;
}

export interface MissionData {
  id: string;
  client_first_name: string;
  client_last_name: string;
  client_email?: string;
  client_address: string;
  client_phone: string;
  appointment_time: string;
  assigned_workers?: string[];
  mission_subtypes?: string[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly fromEmail: string;
  private readonly adminEmail = 'emjisolutions@gmail.com';

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('FROM_EMAIL') || 'info@goboclean.be';
    
    if (!resendApiKey) {
      this.logger.error('❌ RESEND_API_KEY is not configured');
      throw new Error('RESEND_API_KEY is required');
    }
    
    this.logger.log(`🔧 Initializing Resend with from email: ${this.fromEmail}`);
    this.resend = new Resend(resendApiKey);
    
    this.logger.log('✅ Resend initialized successfully');
  }

  async sendReportEmail(params: SendReportEmailParams): Promise<void> {
    const { to, clientName, reportId, pdfBuffer, workerName, address } = params;

    // Always send to admin email (emjisolutions@gmail.com) and client email
    const recipients = [this.adminEmail];
    if (to && to !== this.adminEmail) {
      recipients.push(to);
    }

    const pdfBase64 = pdfBuffer.toString('base64');

    try {
      this.logger.log(`📧 Sending report email to ${recipients.join(', ')} for report ${reportId}`);
      
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipients,
        subject: `Rapport d'intervention - Nettoyage de toiture`,
        html: this.generateEmailTemplate(clientName, reportId, workerName, address),
        attachments: [
          {
            filename: `Rapport-${reportId.slice(0, 8).toUpperCase()}.pdf`,
            content: pdfBase64,
          },
        ],
      });

      this.logger.log(`✅ Email sent successfully to ${recipients.join(', ')}. Message ID: ${result.data?.id}`);
    } catch (error: any) {
      this.logger.error(`❌ Error sending report email: ${error.message}`);
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

  // ---------------------------------------------------------------------------
  // Mission-related emails
  // ---------------------------------------------------------------------------

  async sendMissionAssignedEmail(mission: MissionData, workerEmails: string[]): Promise<void> {
    if (!workerEmails || workerEmails.length === 0) {
      this.logger.log(`No worker emails provided for mission ${mission.id}, skipping assignment email`);
      return;
    }
    
    // Always include admin email
    const recipients = [this.adminEmail, ...workerEmails];
    const clientName = `${mission.client_first_name} ${mission.client_last_name}`;
    const appointmentDate = new Date(mission.appointment_time).toLocaleString('fr-BE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: recipients,
        subject: `Nouvelle mission assignée — ${clientName}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#064e3b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#f0fdf4;border-left:4px solid #064e3b;padding:12px;margin:16px 0}
</style></head><body>
<div class="header"><h1 style="margin:0">GoBo Clean</h1><p style="margin:8px 0 0">Nouvelle mission</p></div>
<div class="content">
  <h2>Mission assignée</h2>
  <p>Une nouvelle mission vous a été assignée :</p>
  <div class="info">
    <p><strong>👤 Client :</strong> ${clientName}</p>
    <p><strong>📍 Adresse :</strong> ${mission.client_address}</p>
    <p><strong>📅 Date :</strong> ${appointmentDate}</p>
    <p><strong>📞 Téléphone :</strong> ${mission.client_phone}</p>
  </div>
  <p>Ouvrez l'application pour consulter les détails de la mission.</p>
  <p>Cordialement,<br><strong>L'équipe GoBo Clean</strong></p>
</div>
</body></html>`,
      });
      this.logger.log(`Mission assigned email sent for mission ${mission.id}`);
    } catch (error) {
      this.logger.error(`Failed to send mission assigned email: ${error.message}`);
    }
  }

  async sendReportSubmittedEmail(mission: MissionData, adminEmails: string[]): Promise<void> {
    // Always include admin email
    const recipients = [this.adminEmail];
    if (adminEmails && adminEmails.length > 0) {
      recipients.push(...adminEmails.filter(email => email !== this.adminEmail));
    }
    
    const clientName = `${mission.client_first_name} ${mission.client_last_name}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: recipients,
        subject: `Rapport soumis — ${clientName} — ${mission.client_address}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#064e3b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin:16px 0}
</style></head><body>
<div class="header"><h1 style="margin:0">GoBo Clean</h1><p style="margin:8px 0 0">Rapport soumis</p></div>
<div class="content">
  <h2>Photos "avant" soumises</h2>
  <p>Les photos avant-intervention ont été soumises pour la mission suivante :</p>
  <div class="info">
    <p><strong>👤 Client :</strong> ${clientName}</p>
    <p><strong>📍 Adresse :</strong> ${mission.client_address}</p>
    <p><strong>⏱️ Timer :</strong> 10 minutes de travail minimum démarré</p>
  </div>
  <p>Ouvrez l'application pour consulter le rapport.</p>
  <p>Cordialement,<br><strong>L'équipe GoBo Clean</strong></p>
</div>
</body></html>`,
      });
      this.logger.log(`Report submitted email sent for mission ${mission.id}`);
    } catch (error) {
      this.logger.error(`Failed to send report submitted email: ${error.message}`);
    }
  }

  async sendMissionCompletedEmail(mission: MissionData, recipientEmails: string[]): Promise<void> {
    // Always include admin email
    const recipients = [this.adminEmail];
    if (recipientEmails && recipientEmails.length > 0) {
      recipients.push(...recipientEmails.filter(email => email !== this.adminEmail));
    }
    
    const clientName = `${mission.client_first_name} ${mission.client_last_name}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: recipients,
        subject: `Mission terminée — ${clientName} — ${mission.client_address}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#064e3b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:16px 0}
</style></head><body>
<div class="header"><h1 style="margin:0">GoBo Clean</h1><p style="margin:8px 0 0">Mission terminée ✅</p></div>
<div class="content">
  <h2>Mission complétée avec succès</h2>
  <p>La mission suivante a été terminée :</p>
  <div class="info">
    <p><strong>👤 Client :</strong> ${clientName}</p>
    <p><strong>📍 Adresse :</strong> ${mission.client_address}</p>
    <p><strong>✅ Statut :</strong> Terminée</p>
  </div>
  <p>Le rapport final est disponible dans l'application. Un PDF sera envoyé au client.</p>
  <p>Cordialement,<br><strong>L'équipe GoBo Clean</strong></p>
</div>
</body></html>`,
      });
      this.logger.log(`Mission completed email sent for mission ${mission.id}`);
    } catch (error) {
      this.logger.error(`Failed to send mission completed email: ${error.message}`);
    }
  }

  async sendMissionCancelledEmail(mission: MissionData, workerEmails: string[]): Promise<void> {
    // Always include admin email
    const recipients = [this.adminEmail];
    if (workerEmails && workerEmails.length > 0) {
      recipients.push(...workerEmails.filter(email => email !== this.adminEmail));
    }
    
    const clientName = `${mission.client_first_name} ${mission.client_last_name}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: recipients,
        subject: `Mission annulée — ${clientName} — ${mission.client_address}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#991b1b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#fef2f2;border-left:4px solid #dc2626;padding:12px;margin:16px 0}
</style></head><body>
<div class="header"><h1 style="margin:0">GoBo Clean</h1><p style="margin:8px 0 0">Mission annulée</p></div>
<div class="content">
  <h2>Mission annulée</h2>
  <p>La mission suivante a été annulée :</p>
  <div class="info">
    <p><strong>👤 Client :</strong> ${clientName}</p>
    <p><strong>📍 Adresse :</strong> ${mission.client_address}</p>
  </div>
  <p>Contactez l'administrateur pour plus d'informations.</p>
  <p>Cordialement,<br><strong>L'équipe GoBo Clean</strong></p>
</div>
</body></html>`,
      });
      this.logger.log(`Mission cancelled email sent for mission ${mission.id}`);
    } catch (error) {
      this.logger.error(`Failed to send mission cancelled email: ${error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logger.log('🔍 Testing Resend API connection...');
      // Resend doesn't have a verify method, so we just check if the API key is set
      if (this.resend) {
        this.logger.log('✅ Resend API initialized successfully');
        return true;
      }
      return false;
    } catch (error: any) {
      this.logger.error(`❌ Resend API connection failed: ${error.message}`);
      return false;
    }
  }
}

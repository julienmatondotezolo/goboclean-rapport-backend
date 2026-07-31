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

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required');
    }
    
    this.logger.log(`🔧 Initializing Resend API: ${apiKey.substring(0, 8)}...`);
    
    this.resend = new Resend(apiKey);
    
    // Test connection on startup  
    this.testConnection();
  }

  async sendReportEmail(params: SendReportEmailParams): Promise<void> {
    const { to, clientName, reportId, pdfBuffer, workerName, address } = params;

    try {
      this.logger.log(`📧 Sending report email to ${to} for report ${reportId}`);
      
      const { data, error } = await this.resend.emails.send({
        from: this.configService.get<string>('SMTP_FROM') || 'rapport@goboclean.be',
        to: [to],
        subject: `Votre rapport d'intervention — Roof Revive by GoboClean (N° ${reportId.slice(0, 8).toUpperCase()})`,
        html: this.generateEmailTemplate(clientName, reportId, workerName, address),
        attachments: [
          {
            filename: `Rapport-${reportId.slice(0, 8).toUpperCase()}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (error) {
        this.logger.error(`❌ Error sending report email to ${to}: ${error.message}`);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`✅ Email sent successfully to ${to}. Message ID: ${data?.id}`);
    } catch (error: any) {
      this.logger.error(`❌ Error sending report email to ${to}: ${error.message}`);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Email client (bon d'exécution / rapport) — HTML transactionnel :
   * layout en tables + styles 100 % inline (Gmail supprime les blocs <style>),
   * pas de SVG (non rendu par la plupart des clients mail).
   */
  private generateEmailTemplate(
    clientName: string,
    reportId: string,
    workerName: string,
    address: string,
  ): string {
    const green = '#064e3b';
    const lime = '#a3e635';
    const muted = '#64748b';
    const border = '#e2e8f0';
    const reportNumber = reportId.slice(0, 8).toUpperCase();
    const infoRow = (label: string, value: string) => `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:${muted};width:38%;vertical-align:top;">${label}</td>
        <td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:bold;">${value}</td>
      </tr>`;

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- En-tête : logo Roof Revive -->
        <tr><td style="background-color:#ffffff;border-radius:12px 12px 0 0;padding:26px 32px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <img src="https://ihlnwzrsvfxgossytuiz.supabase.co/storage/v1/object/public/company-assets/roofrevive-logo.png"
                   alt="Roof Revive" width="130" style="display:block;width:130px;height:auto;" />
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:${green};margin-top:6px;">Roof Revive <span style="font-weight:normal;color:#64748b;">by GoboClean</span></div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#94a3b8;letter-spacing:2px;margin-top:2px;">NETTOYAGE &amp; ENTRETIEN DE TOITURES</div>
            </td>
            <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;vertical-align:bottom;">
              Rapport N° ${reportNumber}
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:${green};height:5px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="background-color:${lime};height:3px;font-size:0;">&nbsp;</td></tr>

        <!-- Corps -->
        <tr><td style="background-color:#ffffff;padding:32px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;"><strong>Bonjour ${clientName},</strong></p>
          <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
            Merci d'avoir fait confiance à <strong>Roof Revive by GoboClean</strong> pour l'entretien de votre toiture.
            Vous trouverez en pièce jointe le rapport complet de l'intervention réalisée à votre domicile.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background-color:#f8fafc;border:1px solid ${border};border-radius:10px;margin:20px 0;">
            <tr><td style="padding:18px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${infoRow('Rapport', 'N° ' + reportNumber)}
                ${infoRow('Adresse', address)}
                ${infoRow('Technicien', workerName)}
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:14px;color:#334155;">Le rapport en pièce jointe comprend&nbsp;:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="font-size:14px;color:${green};padding:2px 8px 2px 0;">&#10003;</td><td style="font-size:13px;color:#334155;padding:2px 0;">le détail des services effectués</td></tr>
            <tr><td style="font-size:14px;color:${green};padding:2px 8px 2px 0;">&#10003;</td><td style="font-size:13px;color:#334155;padding:2px 0;">les photos avant / après intervention</td></tr>
            <tr><td style="font-size:14px;color:${green};padding:2px 8px 2px 0;">&#10003;</td><td style="font-size:13px;color:#334155;padding:2px 0;">les observations de notre technicien</td></tr>
            <tr><td style="font-size:14px;color:${green};padding:2px 8px 2px 0;">&#10003;</td><td style="font-size:13px;color:#334155;padding:2px 0;">les signatures de validation</td></tr>
          </table>

          <p style="margin:0 0 16px;font-size:13px;color:${muted};line-height:1.6;">
            Ce document atteste de la prestation effectuée et peut servir pour vos dossiers personnels ou d'assurance.
          </p>

          <p style="margin:24px 0 0;font-size:14px;color:#334155;line-height:1.6;">
            Une question, ou besoin d'une prochaine intervention&nbsp;?
            Répondez simplement à cet email ou contactez-nous.
          </p>
          <p style="margin:16px 0 0;font-size:14px;color:#1e293b;">Cordialement,<br><strong>L'équipe Roof Revive by GoboClean</strong></p>
        </td></tr>

        <!-- Pied de page -->
        <tr><td style="background-color:#ffffff;border-radius:0 0 12px 12px;border-top:1px solid ${border};padding:20px 32px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0;font-size:12px;color:${muted};text-align:center;">
            <strong style="color:${green};">Roof Revive by GoboClean</strong> · Bruxelles, Belgique · <a href="mailto:contact@goboclean.be" style="color:${green};text-decoration:none;">contact@goboclean.be</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ---------------------------------------------------------------------------
  // Mission-related emails
  // ---------------------------------------------------------------------------

  async sendMissionAssignedEmail(mission: MissionData, workerEmails: string[]): Promise<void> {
    if (!workerEmails || workerEmails.length === 0) {
      this.logger.log(`No worker emails provided for mission ${mission.id}, skipping assignment email`);
      return;
    }

    const clientName = `${mission.client_first_name} ${mission.client_last_name}`;
    const appointmentDate = new Date(mission.appointment_time).toLocaleString('fr-BE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    try {
      this.logger.log(`📧 Sending mission assigned email for mission ${mission.id} to ${workerEmails.join(', ')}`);
      
      const { data, error } = await this.resend.emails.send({
        from: this.configService.get<string>('SMTP_FROM') || 'rapport@goboclean.be',
        to: workerEmails,
        subject: `Goboclean Mail: Nouvelle mission assignée — ${clientName}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#064e3b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#f0fdf4;border-left:4px solid:#064e3b;padding:12px;margin:16px 0}
.logo{display:inline-flex;align-items:center;justify-content:center;margin-bottom:15px}
</style></head><body>
<div class="header">
  <div class="logo">
    <div style="position:relative;transform:scale(0.75);margin-right:15px">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#a3e635">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      </svg>
      <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-weight:bold;color:#a3e635;font-size:18px">G</span>
    </div>
    <div>
      <h1 style="margin:0;font-size:28px">GoBo Clean</h1>
      <p style="margin:5px 0 0;opacity:0.9">Nouvelle mission</p>
    </div>
  </div>
</div>
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

      if (error) {
        this.logger.error(`❌ Failed to send mission assigned email: ${error.message}`);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`✅ Mission assigned email sent for mission ${mission.id}. Message ID: ${data?.id}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send mission assigned email: ${error.message}`);
      throw error;
    }
  }

  async sendPreReportEmail(mission: MissionData, adminEmails: string[]): Promise<void> {
    if (!adminEmails || adminEmails.length === 0) {
      this.logger.log(`No admin emails provided for mission ${mission.id}, skipping pre-report email`);
      return;
    }

    const clientName = `${mission.client_first_name} ${mission.client_last_name}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.configService.get<string>('SMTP_FROM') || 'rapport@goboclean.be',
        to: adminEmails,
        subject: `Goboclean Mail: Pré-rapport soumis — ${clientName} — ${mission.client_address}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#064e3b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin:16px 0}
.logo{display:inline-flex;align-items:center;justify-content:center;margin-bottom:15px}
</style></head><body>
<div class="header">
  <div class="logo">
    <div style="position:relative;transform:scale(0.75);margin-right:15px">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#a3e635">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      </svg>
      <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-weight:bold;color:#a3e635;font-size:18px">G</span>
    </div>
    <div>
      <h1 style="margin:0;font-size:28px">GoBo Clean</h1>
      <p style="margin:5px 0 0;opacity:0.9">Pré-rapport</p>
    </div>
  </div>
</div>
<div class="content">
  <h2>Photos "avant" soumises</h2>
  <p>Les photos avant-intervention ont été soumises pour la mission suivante :</p>
  <div class="info">
    <p><strong>👤 Client :</strong> ${clientName}</p>
    <p><strong>📍 Adresse :</strong> ${mission.client_address}</p>
    <p><strong>⏱️ Timer :</strong> 10 minutes de travail minimum démarré</p>
  </div>
  <p>Ouvrez l'application pour consulter le pré-rapport.</p>
  <p>Cordialement,<br><strong>L'équipe GoBo Clean</strong></p>
</div>
</body></html>`,
      });

      if (error) {
        this.logger.error(`❌ Failed to send pre-report email: ${error.message}`);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`✅ Pre-report email sent for mission ${mission.id}. Message ID: ${data?.id}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send pre-report email: ${error.message}`);
      throw error;
    }
  }

  async sendMissionCompletedEmail(mission: MissionData, recipientEmails: string[], pdfBuffer?: Buffer): Promise<void> {
    // Always include roofrevive.be@gmail.com in completion emails
    const allRecipients = [...(recipientEmails || [])];
    if (!allRecipients.includes('roofrevive.be@gmail.com')) {
      allRecipients.push('roofrevive.be@gmail.com');
    }

    if (allRecipients.length === 0) {
      this.logger.log(`No recipient emails provided for mission ${mission.id}, skipping completion email`);
      return;
    }

    const clientName = `${mission.client_first_name} ${mission.client_last_name}`;
    
    // Prepare attachments
    const attachments = [];
    
    // Use Goboclean logo from Supabase
    const logoUrl = 'https://ihlnwzrsvfxgossytuiz.supabase.co/storage/v1/object/public/company-assets/goboclean-logo.png';
    
    if (pdfBuffer) {
      attachments.push({
        filename: `Rapport-${mission.id.slice(0, 8).toUpperCase()}.pdf`,
        content: pdfBuffer,
      });
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.configService.get<string>('SMTP_FROM') || 'rapport@goboclean.be',
        to: allRecipients,
        subject: `Goboclean Rapport: Mission terminée — ${clientName} — #${mission.id.slice(0, 8).toUpperCase()}`,
        attachments,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#064e3b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:16px 0}
.logo{display:inline-flex;align-items:center;justify-content:center;margin-bottom:15px}
.goboclean-logo{width:60px;height:60px;margin-right:15px;border-radius:12px}
</style></head><body>
<div class="header">
  <div class="logo">
    <img src="${logoUrl}" alt="GoBo Clean" class="goboclean-logo">
    <div>
      <h1 style="margin:0;font-size:28px;color:#a3e635">GoBo Clean</h1>
      <p style="margin:5px 0 0;opacity:0.9">Mission terminée ✅</p>
    </div>
  </div>
</div>
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
        ...(attachments.length > 0 && { attachments }),
      });

      if (error) {
        this.logger.error(`❌ Failed to send mission completed email: ${error.message}`);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`✅ Mission completed email sent for mission ${mission.id}. Message ID: ${data?.id}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send mission completed email: ${error.message}`);
      throw error;
    }
  }

  async sendMissionCancelledEmail(mission: MissionData, workerEmails: string[]): Promise<void> {
    if (!workerEmails || workerEmails.length === 0) {
      this.logger.log(`No worker emails provided for mission ${mission.id}, skipping cancellation email`);
      return;
    }

    const clientName = `${mission.client_first_name} ${mission.client_last_name}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.configService.get<string>('SMTP_FROM') || 'rapport@goboclean.be',
        to: workerEmails,
        subject: `Goboclean Mail: Mission annulée — ${clientName} — ${mission.client_address}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#991b1b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#fef2f2;border-left:4px solid #dc2626;padding:12px;margin:16px 0}
.logo{display:inline-flex;align-items:center;justify-content:center;margin-bottom:15px}
</style></head><body>
<div class="header">
  <div class="logo">
    <div style="position:relative;transform:scale(0.75);margin-right:15px">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#a3e635">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      </svg>
      <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-weight:bold;color:#a3e635;font-size:18px">G</span>
    </div>
    <div>
      <h1 style="margin:0;font-size:28px">GoBo Clean</h1>
      <p style="margin:5px 0 0;opacity:0.9">Mission annulée</p>
    </div>
  </div>
</div>
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

      if (error) {
        this.logger.error(`❌ Failed to send mission cancelled email: ${error.message}`);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`✅ Mission cancelled email sent for mission ${mission.id}. Message ID: ${data?.id}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send mission cancelled email: ${error.message}`);
      throw error;
    }
  }

  // Logger now defined at class level above

  async testConnection(): Promise<boolean> {
    try {
      this.logger.log('🔍 Testing Resend API connection...');
      
      // Test with a simple API call to domains endpoint
      const domains = await this.resend.domains.list();
      
      this.logger.log('✅ Resend API connection successful');
      return true;
    } catch (error: any) {
      this.logger.error(`❌ Resend API connection failed: ${error.message}`);
      return false;
    }
  }

  async sendTestCompletionEmail(recipientEmail: string): Promise<void> {
    this.logger.log(`📧 Sending test completion email to ${recipientEmail}`);

    // Create realistic test report data that matches the PDF template structure
    const testReportData = {
      id: 'a1b2c3d4-test-report-id',
      worker: {
        first_name: 'Marc',
        last_name: 'Janssens',
      },
      client_first_name: 'Jean',
      client_last_name: 'Dupont',
      client_address: 'Rue des Fleurs 123, 1000 Bruxelles',
      client_phone: '+32 2 123 45 67',
      mission_type: 'roof',
      mission_subtypes: ['cleaning'],
      appointment_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      surface_area: 95,
      additional_info: 'Test standard roof cleaning service for demonstration',
      photos: [
        {
          id: '1',
          type: 'before' as const,
          url: 'https://via.placeholder.com/400x300/064e3b/a3e635?text=BEFORE+PHOTO+1',
          order: 1,
        },
        {
          id: '2', 
          type: 'before' as const,
          url: 'https://via.placeholder.com/400x300/064e3b/a3e635?text=BEFORE+PHOTO+2',
          order: 2,
        },
        {
          id: '3',
          type: 'after' as const,
          url: 'https://via.placeholder.com/400x300/a3e635/064e3b?text=AFTER+PHOTO+1',
          order: 1,
        },
        {
          id: '4',
          type: 'after' as const,
          url: 'https://via.placeholder.com/400x300/a3e635/064e3b?text=AFTER+PHOTO+2', 
          order: 2,
        },
      ],
      worker_signature_url: 'https://via.placeholder.com/200x100/000000/ffffff?text=Worker+Signature',
      client_signature_url: 'https://via.placeholder.com/200x100/000000/ffffff?text=Client+Signature',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      roof_type: 'concrete',
      roof_surface: 95,
      moss_level: 'medium',
      comments: 'Test cleaning completed successfully. All areas thoroughly cleaned and inspected.',
    };

    // Create test company data
    const testCompany = {
      company_name: 'GoBo solutions',
      company_email: 'info@goboclean.be',
      company_phone: '+32 56 25 63 83',
      company_address: 'Professional Cleaning Services',
      logo_url: '/Users/emji/.openclaw/workspace/goboclean-backend/assets/goboclean-logo.png',
      legal_mentions: 'Professional cleaning services - Licensed and insured',
    };

    // Generate actual PDF using the PDF service
    let testPdfContent: Buffer;
    try {
      const { PdfService } = await import('../pdf/pdf.service');
      const pdfService = new PdfService();
      testPdfContent = await pdfService.generateReportPDF(testReportData, testCompany);
      this.logger.log('✅ Generated test PDF using report template');
    } catch (pdfError) {
      this.logger.error(`❌ Failed to generate PDF: ${pdfError.message}`);
      // Fallback to simple PDF if template fails
      testPdfContent = Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj  
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 72 720 Td (PDF Generation Failed) Tj ET
endstream endobj
xref 0 5 0000000000 65535 f 0000000015 00000 n 0000000066 00000 n 0000000123 00000 n 0000000281 00000 n trailer<</Size 5/Root 1 0 R>>startxref 350 %%EOF`);
    }

    const attachments = [{
      filename: `Rapport-A1B2C3D4.pdf`,
      content: testPdfContent,
    }];

    // Use Goboclean logo from Supabase
    const logoUrl = 'https://ihlnwzrsvfxgossytuiz.supabase.co/storage/v1/object/public/company-assets/goboclean-logo.png';

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.configService.get<string>('SMTP_FROM') || 'rapport@goboclean.be',
        to: [recipientEmail],
        subject: `Goboclean Rapport: Mission terminée — Jean Dupont — #A1B2C3D4`,
        attachments,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;color:#333;max-width:600px;margin:auto;padding:20px}
.header{background:#064e3b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0}
.content{background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none}
.info{background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:16px 0}
.logo{display:inline-flex;align-items:center;justify-content:center;margin-bottom:15px}
.goboclean-logo{width:60px;height:60px;margin-right:15px;border-radius:12px}
</style></head><body>
<div class="header">
  <div class="logo">
    <img src="${logoUrl}" alt="GoBo Clean" class="goboclean-logo">
    <div>
      <h1 style="margin:0;font-size:28px;color:#a3e635">GoBo Clean</h1>
      <p style="margin:5px 0 0;opacity:0.9">Mission terminée ✅</p>
    </div>
  </div>
</div>

<div class="content">
  <h2 style="color:#064e3b;margin-top:0">🎯 Test - Mission terminée</h2>
  
  <div class="info">
    <h3 style="margin-top:0;color:#16a34a">✅ Mission complétée avec succès</h3>
    <p style="margin-bottom:0"><strong>Client:</strong> Jean Dupont<br>
    <strong>Adresse:</strong> Rue des Fleurs 123, 1000 Bruxelles<br>
    <strong>Mission ID:</strong> #A1B2C3D4<br>
    <strong>Type:</strong> Test de rapport PDF</p>
  </div>

  <h3>📋 Résumé de la mission</h3>
  <p>Ceci est un test du système de rapport automatique de Goboclean.</p>
  
  <ul>
    <li><strong>Début:</strong> Il y a 4 heures</li>
    <li><strong>Fin:</strong> Test en cours</li>
    <li><strong>Technicien:</strong> Équipe de test</li>
    <li><strong>Services:</strong> Nettoyage de test</li>
  </ul>

  <h3>📎 Documents joints</h3>
  <p>Le rapport complet PDF est joint à cet email avec toutes les photos et signatures.</p>

  <div style="background:#f8fafc;padding:16px;border-radius:6px;margin:20px 0;text-align:center">
    <p style="margin:0;color:#475569"><strong>📧 Email de test envoyé avec succès!</strong><br>
    Format: Goboclean Rapport: Mission terminée — Jean Dupont — #A1B2C3D4</p>
  </div>
</div>

<div style="background:#f8fafc;padding:20px;text-align:center;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb">
  <p style="margin:0;color:#64748b;font-size:14px">
    <strong>GoBo Clean</strong> | Nettoyage professionnel<br>
    📧 rapport@goboclean.be | 📞 +32 56 25 63 83
  </p>
</div>
</body></html>`,
      });

      if (error) {
        this.logger.error(`❌ Failed to send test email: ${error.message}`);
        throw error;
      }

      this.logger.log(`✅ Test completion email sent to ${recipientEmail}. Message ID: ${data?.id}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send test completion email: ${error.message}`);
      throw error;
    }
  }
}
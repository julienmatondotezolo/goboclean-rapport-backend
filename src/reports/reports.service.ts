import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PdfService } from '../pdf/pdf.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ReportsService {
  constructor(
    private supabaseService: SupabaseService,
    private pdfService: PdfService,
    private emailService: EmailService,
  ) {}

  async generateAndSendReport(reportId: string) {
    // 1. Get report data with photos
    const report = await this.supabaseService.getReport(reportId);
    
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // 2. Get company settings
    const company = await this.supabaseService.getCompanySettings();

    // 3. Get public URLs for photos
    const photosWithUrls = await Promise.all(
      report.photos.map(async (photo) => {
        const url = this.supabaseService.getPublicUrl('roof-photos', photo.storage_path);
        return {
          ...photo,
          url,
        };
      }),
    );

    // Signature URLs are already full public URLs from the database
    const reportData = {
      ...report,
      photos: photosWithUrls,
      worker_signature_url: report.worker_signature_url,
      client_signature_url: report.client_signature_url,
    };

    // 4. Generate PDF
    const pdfBuffer = await this.pdfService.generateReportPDF(reportData, company);

    // 5. Upload PDF to Supabase Storage
    const pdfPath = `${reportId}/report.pdf`;
    await this.supabaseService.uploadFile('pdfs', pdfPath, pdfBuffer, 'application/pdf');
    
    const pdfUrl = this.supabaseService.getPublicUrl('pdfs', pdfPath);

    // 6. Update report with PDF URL
    await this.supabaseService.updateReport(reportId, {
      pdf_url: pdfUrl,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // 7. Send email to client
    await this.emailService.sendReportEmail({
      to: company.company_email, // In production, use client email
      clientName: `${report.client_first_name} ${report.client_last_name}`,
      reportId: report.id,
      pdfBuffer,
      workerName: `${report.worker.first_name} ${report.worker.last_name}`,
      address: report.client_address,
    });

    return {
      success: true,
      pdfUrl,
      message: 'Report generated and sent successfully',
    };
  }

  async getReport(reportId: string) {
    const report = await this.supabaseService.getReport(reportId);
    
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    return report;
  }

  async getReports(workerId?: string) {
    return await this.supabaseService.getReports(workerId);
  }

  async regeneratePdfOnly(reportId: string) {
    // 1. Get report data with photos
    const report = await this.supabaseService.getReport(reportId);
    
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // 2. Get company settings
    const company = await this.supabaseService.getCompanySettings();

    // 3. Get public URLs for photos
    const photosWithUrls = await Promise.all(
      report.photos.map(async (photo) => {
        const url = this.supabaseService.getPublicUrl('roof-photos', photo.storage_path);
        return {
          ...photo,
          url,
        };
      }),
    );

    // Signature URLs are already full public URLs from the database
    const reportData = {
      ...report,
      photos: photosWithUrls,
      worker_signature_url: report.worker_signature_url,
      client_signature_url: report.client_signature_url,
    };

    // 4. Generate PDF
    const pdfBuffer = await this.pdfService.generateReportPDF(reportData, company);

    // 5. Upload PDF to Supabase Storage
    const pdfPath = `${reportId}/report.pdf`;
    await this.supabaseService.uploadFile('pdfs', pdfPath, pdfBuffer, 'application/pdf');
    
    const pdfUrl = this.supabaseService.getPublicUrl('pdfs', pdfPath);

    // 6. Update report with PDF URL
    await this.supabaseService.updateReport(reportId, {
      pdf_url: pdfUrl,
    });

    return {
      success: true,
      pdfUrl,
      message: 'PDF regenerated successfully (email not sent)',
    };
  }
}

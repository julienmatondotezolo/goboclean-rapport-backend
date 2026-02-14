import { Injectable, Logger } from '@nestjs/common';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportPDF } from './templates/report-pdf';

export interface ReportData {
  id: string;
  worker: {
    first_name: string;
    last_name: string;
  };
  client_first_name: string;
  client_last_name: string;
  client_address: string;
  client_phone: string;
  roof_type: string;
  roof_surface: number;
  moss_level: string;
  comments?: string;
  worker_signature_url?: string;
  worker_signature_date?: string;
  client_signature_url?: string;
  client_signature_date?: string;
  photos: {
    type: 'before' | 'after';
    url: string;
    order: number;
  }[];
  created_at: string;
  completed_at?: string;
  // Mission details
  mission_type?: string;
  mission_subtypes?: string[];
  appointment_time?: string;
  started_at?: string;
  surface_area?: number;
  additional_info?: string;
}

export interface CompanySettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  logo_url?: string;
  legal_mentions?: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  // Helper function to download image and convert to base64 data URL
  private async downloadImageAsBase64(url: string): Promise<string | null> {
    try {
      this.logger.log(`📸 Downloading image: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`❌ Failed to download image: ${url} (${response.status})`);
        return null;
      }
      
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      
      // Determine mime type from response or URL extension
      const contentType = response.headers.get('content-type') || 'image/png';
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      this.logger.log(`✅ Downloaded image as base64: ${url} (${Math.round(buffer.byteLength / 1024)}KB)`);
      return dataUrl;
    } catch (error: any) {
      this.logger.error(`❌ Error downloading image ${url}: ${error.message}`);
      return null;
    }
  }
  async generateReportPDF(
    reportData: ReportData,
    companySettings: CompanySettings,
  ): Promise<Buffer> {
    try {
      this.logger.log(`🔄 Converting remote images to base64 for PDF generation`);
      
      // Convert photos to base64
      const photosWithBase64 = await Promise.all(
        reportData.photos.map(async (photo) => {
          const base64Url = await this.downloadImageAsBase64(photo.url);
          return {
            ...photo,
            url: base64Url || photo.url, // Fall back to original URL if download fails
          };
        })
      );

      // Convert signatures to base64
      const workerSignatureBase64 = reportData.worker_signature_url 
        ? await this.downloadImageAsBase64(reportData.worker_signature_url)
        : null;
        
      const clientSignatureBase64 = reportData.client_signature_url
        ? await this.downloadImageAsBase64(reportData.client_signature_url)
        : null;

      // Create report data with base64 images
      const reportDataWithBase64: ReportData = {
        ...reportData,
        photos: photosWithBase64,
        worker_signature_url: workerSignatureBase64 || reportData.worker_signature_url,
        client_signature_url: clientSignatureBase64 || reportData.client_signature_url,
      };

      this.logger.log(`📄 Generating PDF with ${photosWithBase64.length} photos and ${workerSignatureBase64 ? '✅' : '❌'} worker signature, ${clientSignatureBase64 ? '✅' : '❌'} client signature`);

      const document = React.createElement(ReportPDF, {
        report: reportDataWithBase64,
        company: companySettings,
      });

      // @ts-ignore - Type mismatch with @react-pdf/renderer types
      const buffer = await renderToBuffer(document);
      this.logger.log(`✅ PDF generated successfully (${Math.round(buffer.length / 1024)}KB)`);
      return buffer;
    } catch (error) {
      this.logger.error(`❌ Error generating PDF: ${error.message}`);
      throw new Error('Failed to generate PDF');
    }
  }

  getRoofTypeLabel(type: string): string {
    const types = {
      slate: 'Ardoise',
      terracotta: 'Terre cuite',
      concrete: 'Béton',
      metal: 'Métal',
      shingle: 'Bardeau',
      other: 'Autre',
    };
    return types[type] || type;
  }

  getMossLevelLabel(level: string): string {
    const levels = {
      low: 'Faible',
      medium: 'Moyen',
      high: 'Fort',
    };
    return levels[level] || level;
  }
}

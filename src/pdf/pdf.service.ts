import { Injectable } from '@nestjs/common';
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
  async generateReportPDF(
    reportData: ReportData,
    companySettings: CompanySettings,
  ): Promise<Buffer> {
    try {
      const document = React.createElement(ReportPDF, {
        report: reportData,
        company: companySettings,
      });

      // @ts-ignore - Type mismatch with @react-pdf/renderer types
      const buffer = await renderToBuffer(document);
      return buffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
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

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #0ea5e9',
  },
  logo: {
    width: 80,
    height: 80,
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0ea5e9',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e40af',
    backgroundColor: '#e0f2fe',
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
  },
  value: {
    width: '60%',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    width: '48%',
    marginBottom: 10,
  },
  photoLabel: {
    fontSize: 9,
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  photo: {
    width: '100%',
    height: 150,
    objectFit: 'cover',
    border: '1 solid #e5e7eb',
  },
  signatureContainer: {
    width: '48%',
  },
  signatureLabel: {
    fontSize: 10,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  signature: {
    width: '100%',
    height: 80,
    border: '1 solid #d1d5db',
    backgroundColor: '#f9fafb',
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
  comments: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderLeft: '3 solid #0ea5e9',
    fontSize: 10,
    lineHeight: 1.5,
  },
});

interface ReportPDFProps {
  report: any;
  company: any;
}

export const ReportPDF: React.FC<ReportPDFProps> = ({ report, company }) => {
  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy à HH:mm', { locale: fr });
  };

  const getRoofTypeLabel = (type: string) => {
    const types = {
      slate: 'Ardoise',
      terracotta: 'Terre cuite',
      concrete: 'Béton',
      metal: 'Métal',
      shingle: 'Bardeau',
      other: 'Autre',
    };
    return types[type] || type;
  };

  const getMossLevelLabel = (level: string) => {
    const levels = {
      low: 'Faible',
      medium: 'Moyen',
      high: 'Fort',
    };
    return levels[level] || level;
  };

  const beforePhotos = report.photos.filter((p) => p.type === 'before');
  const afterPhotos = report.photos.filter((p) => p.type === 'after');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Rapport d'Intervention</Text>
            <Text>Nettoyage de toiture</Text>
            <Text style={{ marginTop: 5, fontSize: 10, color: '#6b7280' }}>
              Rapport N° {report.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={{ fontSize: 10, color: '#6b7280' }}>
              Date: {formatDate(report.completed_at || report.created_at)}
            </Text>
          </View>
          <View style={styles.companyInfo}>
            {company.logo_url && (
              <Image src={company.logo_url} style={styles.logo} />
            )}
            <Text style={{ fontWeight: 'bold', marginTop: 10 }}>
              {company.company_name}
            </Text>
            <Text>{company.company_address}</Text>
            <Text>{company.company_phone}</Text>
            <Text>{company.company_email}</Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations Client</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom complet:</Text>
            <Text style={styles.value}>
              {report.client_first_name} {report.client_last_name}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Adresse:</Text>
            <Text style={styles.value}>{report.client_address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Téléphone:</Text>
            <Text style={styles.value}>{report.client_phone}</Text>
          </View>
        </View>

        {/* Roof State */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>État de la Toiture</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Type de toiture:</Text>
            <Text style={styles.value}>{getRoofTypeLabel(report.roof_type)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Surface:</Text>
            <Text style={styles.value}>{report.roof_surface} m²</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Niveau de mousse:</Text>
            <Text style={styles.value}>{getMossLevelLabel(report.moss_level)}</Text>
          </View>
        </View>

        {/* Worker Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intervenant</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Technicien:</Text>
            <Text style={styles.value}>
              {report.worker.first_name} {report.worker.last_name}
            </Text>
          </View>
        </View>

        {/* Comments */}
        {report.comments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations Techniques</Text>
            <View style={styles.comments}>
              <Text>{report.comments}</Text>
            </View>
          </View>
        )}

        {/* Photos BEFORE */}
        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Photos AVANT Intervention</Text>
          <View style={styles.photosGrid}>
            {beforePhotos.map((photo, index) => (
              <View key={photo.id} style={styles.photoContainer}>
                <Text style={styles.photoLabel}>Photo {index + 1}</Text>
                <Image src={photo.url} style={styles.photo} />
              </View>
            ))}
          </View>
        </View>

        {/* Photos AFTER */}
        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Photos APRÈS Intervention</Text>
          <View style={styles.photosGrid}>
            {afterPhotos.map((photo, index) => (
              <View key={photo.id} style={styles.photoContainer}>
                <Text style={styles.photoLabel}>Photo {index + 1}</Text>
                <Image src={photo.url} style={styles.photo} />
              </View>
            ))}
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Signatures - Bon pour Accord</Text>
          <View style={styles.signaturesRow}>
            <View style={styles.signatureContainer}>
              <Text style={styles.signatureLabel}>Signature du Technicien</Text>
              {report.worker_signature_url && (
                <Image src={report.worker_signature_url} style={styles.signature} />
              )}
              {report.worker_signature_date && (
                <Text style={{ fontSize: 8, marginTop: 4, color: '#6b7280' }}>
                  Signé le {formatDateTime(report.worker_signature_date)}
                </Text>
              )}
            </View>
            <View style={styles.signatureContainer}>
              <Text style={styles.signatureLabel}>Signature du Client</Text>
              {report.client_signature_url && (
                <Image src={report.client_signature_url} style={styles.signature} />
              )}
              {report.client_signature_date && (
                <Text style={{ fontSize: 8, marginTop: 4, color: '#6b7280' }}>
                  Signé le {formatDateTime(report.client_signature_date)}
                </Text>
              )}
            </View>
          </View>
          <Text style={{ fontSize: 9, marginTop: 15, color: '#6b7280', textAlign: 'center' }}>
            Le client certifie avoir pris connaissance des travaux effectués et accepte la prestation réalisée.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {company.legal_mentions && <Text>{company.legal_mentions}</Text>}
          <Text style={{ marginTop: 5 }}>
            {company.company_name} - {company.company_email} - {company.company_phone}
          </Text>
          <Text style={{ marginTop: 2 }}>
            Document généré le {formatDateTime(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

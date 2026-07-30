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
    padding: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#000000',
  },
  header: {
    backgroundColor: '#064e3b',
    color: '#ffffff',
    padding: 20,
    marginBottom: 0,
    marginLeft: -30,
    marginRight: -30,
    marginTop: -30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 30,
    paddingRight: 30,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#a3e635',
  },
  companyTagline: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 2,
  },
  reportInfo: {
    textAlign: 'right',
    fontSize: 10,
    color: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 25,
    color: '#000000',
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#064e3b',
    backgroundColor: '#a3e635',
    padding: 10,
    marginLeft: -30,
    marginRight: -30,
    paddingLeft: 30,
    paddingRight: 30,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 30,
    paddingRight: 30,
  },
  label: {
    width: '35%',
    fontWeight: 'bold',
    color: '#000000',
  },
  value: {
    width: '65%',
    color: '#000000',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    paddingLeft: 30,
    paddingRight: 30,
  },
  photoContainer: {
    width: '48%',
    marginBottom: 15,
  },
  photoLabel: {
    fontSize: 10,
    marginBottom: 6,
    fontWeight: 'bold',
    color: '#064e3b',
    backgroundColor: '#a3e635',
    padding: 5,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    border: '2 solid #064e3b',
  },
  signaturesSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    marginTop: 30,
    marginLeft: -30,
    marginRight: -30,
    borderTop: '3 solid #a3e635',
  },
  signatureContainer: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 15,
    border: '1 solid #e5e7eb',
  },
  signatureLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#064e3b',
    textAlign: 'center',
  },
  signature: {
    width: '100%',
    height: 100,
    border: '1 solid #064e3b',
    backgroundColor: '#ffffff',
    objectFit: 'contain',
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 30,
    paddingRight: 30,
  },
  footer: {
    backgroundColor: '#064e3b',
    color: '#ffffff',
    padding: 15,
    marginTop: 30,
    marginLeft: -30,
    marginRight: -30,
    marginBottom: -30,
    textAlign: 'center',
    fontSize: 9,
  },
  emergencySection: {
    backgroundColor: '#064e3b',
    color: '#ffffff',
    padding: 15,
    marginTop: 20,
    marginLeft: -30,
    marginRight: -30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emergencyLeft: {
    paddingLeft: 30,
  },
  emergencyRight: {
    backgroundColor: '#a3e635',
    color: '#064e3b',
    padding: 15,
    fontWeight: 'bold',
    fontSize: 12,
  },
  comments: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderLeft: '4 solid #a3e635',
    fontSize: 11,
    lineHeight: 1.4,
    marginLeft: -30,
    marginRight: -30,
    paddingLeft: 45,
    paddingRight: 30,
    color: '#000000',
  },
  interventionHeader: {
    backgroundColor: '#064e3b',
    color: '#ffffff',
    padding: 25,
    marginTop: 20,
    marginLeft: -30,
    marginRight: -30,
    textAlign: 'center',
  },
  interventionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a3e635',
  },
  interventionSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 5,
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

  const getMissionTypeLabel = (type: string) => {
    const types = {
      roof: 'Nettoyage de toiture',
      facade: 'Nettoyage de façade',
      gutter: 'Nettoyage de gouttières',
      terrace: 'Nettoyage de terrasse',
      other: 'Autre',
    };
    return types[type] || type;
  };

  const getMissionSubtypeLabel = (subtype: string) => {
    const subtypes = {
      cleaning: 'Nettoyage',
      coating: 'Protection/traitement',
      repair: 'Réparation',
      inspection: 'Inspection',
      maintenance: 'Entretien',
      // Catalogue de services Roof Revive (services.json)
      demoussage: 'Démoussage de toiture + inspection gratuite et réparations nécessaires',
      gouttieres: 'Nettoyage des gouttières',
      hydrofuge_wax: 'Traitement hydrofuge (wax) – garantie 3 ans',
      deplacement: 'Déplacement + carburant machine',
      peinture_toiture: 'Peinture de toiture (anthracite)',
      facade: 'Nettoyage de façade',
      panneaux_solaires: 'Nettoyage des panneaux solaires',
      nacelle: 'Location nacelle élévatrice',
      terrasse: 'Nettoyage terrasse',
      mur: 'Nettoyage de mur',
      cheminee: 'Nettoyage cheminée',
      piliers: 'Nettoyage piliers',
      velux: 'Nettoyage velux / vitres',
      driveway: 'Nettoyage allée',
      escalier: 'Nettoyage escalier',
      evac_mousse: 'Évacuation de la mousse',
    };
    return subtypes[subtype] || subtype;
  };

  const beforePhotos = report.photos.filter((p) => p.type === 'before');
  const afterPhotos = report.photos.filter((p) => p.type === 'after');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoSection}>
              <Image src="https://ihlnwzrsvfxgossytuiz.supabase.co/storage/v1/object/public/company-assets/goboclean-logo.png" style={styles.logo} />
              <View>
                <Text style={styles.companyName}>GoBo solutions</Text>
                <Text style={styles.companyTagline}>Professional Cleaning</Text>
              </View>
            </View>
            <View style={styles.reportInfo}>
              <Text>Rapport N° {report.id.slice(0, 8).toUpperCase()}</Text>
              <Text>{formatDate(report.completed_at || report.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Intervention Header */}
        <View style={styles.interventionHeader}>
          <Text style={styles.interventionTitle}>INTERVENTION REPORT</Text>
          <Text style={styles.interventionSubtitle}>Power & Precision in Industrial Cleaning</Text>
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

        {/* Mission Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails de la Mission</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Type de mission:</Text>
            <Text style={styles.value}>{getMissionTypeLabel(report.mission_type)}</Text>
          </View>
          {report.mission_subtypes && report.mission_subtypes.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Services:</Text>
              <Text style={styles.value}>
                {report.mission_subtypes.map(getMissionSubtypeLabel).join(', ')}
              </Text>
            </View>
          )}
          {report.appointment_time && (
            <View style={styles.row}>
              <Text style={styles.label}>Rendez-vous prévu:</Text>
              <Text style={styles.value}>{formatDateTime(report.appointment_time)}</Text>
            </View>
          )}
          {report.started_at && (
            <View style={styles.row}>
              <Text style={styles.label}>Heure de début:</Text>
              <Text style={styles.value}>{formatDateTime(report.started_at)}</Text>
            </View>
          )}
          {report.completed_at && (
            <View style={styles.row}>
              <Text style={styles.label}>Heure de fin:</Text>
              <Text style={styles.value}>{formatDateTime(report.completed_at)}</Text>
            </View>
          )}
          {report.surface_area && (
            <View style={styles.row}>
              <Text style={styles.label}>Surface traitée:</Text>
              <Text style={styles.value}>{report.surface_area} m²</Text>
            </View>
          )}
          {report.additional_info && (
            <View style={styles.row}>
              <Text style={styles.label}>Description:</Text>
              <Text style={styles.value}>{report.additional_info}</Text>
            </View>
          )}
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

        {/* Signatures Section */}
        <View style={styles.signaturesSection}>
          <Text style={styles.sectionTitle}>Authorization & Sign Off</Text>
          <View style={styles.signaturesRow}>
            <View style={styles.signatureContainer}>
              <Text style={styles.signatureLabel}>Technicien Signature</Text>
              {report.worker_signature_url ? (
                <Image src={report.worker_signature_url} style={styles.signature} />
              ) : (
                <View style={styles.signature}>
                  <Text style={{ fontSize: 9, color: '#888', textAlign: 'center', paddingTop: 40 }}>
                    No signature available
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 8, marginTop: 6, color: '#064e3b', textAlign: 'center' }}>
                {report.worker ? `${report.worker.first_name} ${report.worker.last_name}` : 'Worker'}
              </Text>
            </View>
            <View style={styles.signatureContainer}>
              <Text style={styles.signatureLabel}>Client Signature</Text>
              {report.client_signature_url ? (
                <Image src={report.client_signature_url} style={styles.signature} />
              ) : (
                <View style={styles.signature}>
                  <Text style={{ fontSize: 9, color: '#888', textAlign: 'center', paddingTop: 40 }}>
                    No signature available
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 8, marginTop: 6, color: '#064e3b', textAlign: 'center' }}>
                {report.client_first_name} {report.client_last_name}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 10, marginTop: 15, color: '#000', textAlign: 'center', paddingLeft: 30, paddingRight: 30 }}>
            Customer self-effective to our topnotch 
          </Text>
        </View>

        {/* Emergency Response Section */}
        <View style={styles.emergencySection}>
          <View style={styles.emergencyLeft}>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>24/7 Emergency Response</Text>
            <Text style={{ fontSize: 9, marginTop: 2 }}>
              Hotline call +32-456-789-012 
            </Text>
            <Text style={{ fontSize: 9 }}>Service Solutions 24h/24</Text>
          </View>
          <View style={styles.emergencyRight}>
            <Text>Service Solutions 24h/24</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>GoBo solutions - Professional Cleaning Services</Text>
          <Text style={{ marginTop: 3 }}>
            Email: info@goboclean.be | Phone: +32 56 25 63 83
          </Text>
          <Text style={{ marginTop: 3, fontSize: 8 }}>
            Document généré le {formatDateTime(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

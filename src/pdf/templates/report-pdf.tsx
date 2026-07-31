import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Rapport d'intervention — mise en page sobre et professionnelle.
 * Palette : vert marque #064e3b, accent lime #a3e635, gris neutres.
 * Tout le texte est en français ; le pied de page (coordonnées + pagination)
 * est répété sur chaque page.
 */

const GREEN = '#064e3b';
const LIME = '#a3e635';
const TEXT = '#1e293b';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const BG_SOFT = '#f8fafc';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 70,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: TEXT,
    lineHeight: 1.45,
  },

  // ─── En-tête ────────────────────────────────────────────────
  headerBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: GREEN,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    letterSpacing: 0.5,
  },
  companyTagline: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  reportMeta: {
    alignItems: 'flex-end',
  },
  reportTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reportNumber: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  headerRule: {
    borderBottomWidth: 2,
    borderBottomColor: LIME,
    marginBottom: 18,
  },

  // ─── Sections ───────────────────────────────────────────────
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  section: {
    marginBottom: 16,
  },

  // Deux colonnes d'infos (client / intervention)
  twoCols: {
    flexDirection: 'row',
    gap: 16,
  },
  col: {
    flex: 1,
    backgroundColor: BG_SOFT,
    borderRadius: 6,
    padding: 12,
  },
  colTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: '38%',
    color: MUTED,
    fontSize: 9,
  },
  infoValue: {
    width: '62%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },

  // Services
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  serviceBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: LIME,
    marginTop: 4,
    marginRight: 8,
  },
  serviceText: {
    fontSize: 10,
    flex: 1,
  },

  // Observations
  commentsBox: {
    backgroundColor: BG_SOFT,
    borderLeftWidth: 3,
    borderLeftColor: LIME,
    padding: 10,
    borderRadius: 4,
    fontSize: 9.5,
    color: TEXT,
  },

  // Photos
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoContainer: {
    width: '48.5%',
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    height: 170,
    objectFit: 'cover',
    borderRadius: 6,
  },
  photoCaption: {
    fontSize: 8,
    color: MUTED,
    marginTop: 4,
    textAlign: 'center',
  },

  // Signatures
  signaturesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
  },
  signatureLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  signatureImage: {
    width: '100%',
    height: 70,
    objectFit: 'contain',
  },
  signaturePlaceholder: {
    height: 70,
    justifyContent: 'center',
  },
  signatureName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 5,
  },
  signatureMention: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 1,
  },

  // ─── Pied de page (répété) ──────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
  },
  footerRule: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color: MUTED,
  },
});

const SUBTYPE_LABELS: Record<string, string> = {
  cleaning: 'Nettoyage',
  coating: 'Protection / traitement',
  repair: 'Réparation',
  inspection: 'Inspection',
  maintenance: 'Entretien',
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

const ROOF_LABELS: Record<string, string> = {
  slate: 'Ardoise',
  terracotta: 'Terre cuite',
  concrete: 'Béton',
  metal: 'Métal',
  shingle: 'Bardeau',
  other: 'Autre',
};

const MOSS_LABELS: Record<string, string> = { low: 'Faible', medium: 'Moyen', high: 'Fort' };

interface ReportPDFProps {
  report: any;
  company: any;
}

export const ReportPDF: React.FC<ReportPDFProps> = ({ report, company }) => {
  const formatDate = (date: string) => format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  const formatTime = (date: string) => format(new Date(date), 'HH:mm', { locale: fr });
  const formatDateTime = (date: string) =>
    format(new Date(date), "dd/MM/yyyy 'à' HH:mm", { locale: fr });

  const beforePhotos = (report.photos ?? []).filter((p: any) => p.type === 'before');
  const afterPhotos = (report.photos ?? []).filter((p: any) => p.type === 'after');
  const reportNumber = report.id.slice(0, 8).toUpperCase();
  const reportDate = report.completed_at || report.created_at;
  const companyName = company?.company_name || 'GoBo Clean';

  const Footer = () => (
    <View style={styles.footer} fixed>
      <View style={styles.footerRule} />
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {companyName}
          {company?.company_address ? ` — ${company.company_address}` : ''}
        </Text>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
      <View style={[styles.footerRow, { marginTop: 2 }]}>
        <Text style={styles.footerText}>
          {[company?.company_email, company?.company_phone, company?.iban ? `IBAN ${company.iban}` : null]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>
        <Text style={styles.footerText}>Rapport N° {reportNumber}</Text>
      </View>
    </View>
  );

  const PhotoSection = ({ title, photos, prefix }: { title: string; photos: any[]; prefix: string }) =>
    photos.length === 0 ? null : (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.photosGrid}>
          {photos.map((photo: any, index: number) => (
            <View key={photo.id ?? index} style={styles.photoContainer} wrap={false}>
              <Image src={photo.url} style={styles.photo} />
              <Text style={styles.photoCaption}>
                {prefix} — photo {index + 1}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );

  return (
    <Document
      title={`Rapport d'intervention ${reportNumber}`}
      author={companyName}
      subject={`Intervention du ${formatDate(reportDate)}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand} fixed />

        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyTagline}>Nettoyage & entretien de toitures</Text>
          </View>
          <View style={styles.reportMeta}>
            <Text style={styles.reportTitle}>Rapport d'intervention</Text>
            <Text style={styles.reportNumber}>
              N° {reportNumber} · {formatDate(reportDate)}
            </Text>
          </View>
        </View>
        <View style={styles.headerRule} />

        {/* Client & intervention */}
        <View style={[styles.section, styles.twoCols]}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Client</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>
                {report.client_first_name} {report.client_last_name}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>{report.client_address}</Text>
            </View>
            {report.client_phone ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{report.client_phone}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.col}>
            <Text style={styles.colTitle}>Intervention</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {report.appointment_time ? formatDate(report.appointment_time) : '—'}
              </Text>
            </View>
            {report.started_at ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Début</Text>
                <Text style={styles.infoValue}>{formatTime(report.started_at)}</Text>
              </View>
            ) : null}
            {report.completed_at ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fin</Text>
                <Text style={styles.infoValue}>{formatTime(report.completed_at)}</Text>
              </View>
            ) : null}
            {report.surface_area ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Surface</Text>
                <Text style={styles.infoValue}>{report.surface_area} m²</Text>
              </View>
            ) : null}
            {report.worker ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Technicien</Text>
                <Text style={styles.infoValue}>
                  {report.worker.first_name} {report.worker.last_name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* État de la toiture — seulement si renseigné */}
        {(report.roof_type || report.moss_level) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>État de la toiture</Text>
            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                {report.roof_type ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>
                      {ROOF_LABELS[report.roof_type] || report.roof_type}
                    </Text>
                  </View>
                ) : null}
                {report.moss_level ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mousse</Text>
                    <Text style={styles.infoValue}>
                      {MOSS_LABELS[report.moss_level] || report.moss_level}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Services effectués */}
        {report.mission_subtypes?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services effectués</Text>
            {report.mission_subtypes.map((st: string) => (
              <View key={st} style={styles.serviceRow}>
                <View style={styles.serviceBullet} />
                <Text style={styles.serviceText}>{SUBTYPE_LABELS[st] || st}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Observations */}
        {report.comments ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations du technicien</Text>
            <View style={styles.commentsBox}>
              <Text>{report.comments}</Text>
            </View>
          </View>
        ) : null}

        {/* Photos */}
        <PhotoSection title="Avant intervention" photos={beforePhotos} prefix="Avant" />
        <PhotoSection title="Après intervention" photos={afterPhotos} prefix="Après" />

        {/* Signatures */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Validation</Text>
          <View style={styles.signaturesRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Signature du technicien</Text>
              {report.worker_signature_url ? (
                <Image src={report.worker_signature_url} style={styles.signatureImage} />
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={{ fontSize: 8, color: MUTED, textAlign: 'center' }}>
                    Non disponible
                  </Text>
                </View>
              )}
              <Text style={styles.signatureName}>
                {report.worker ? `${report.worker.first_name} ${report.worker.last_name}` : '—'}
              </Text>
              <Text style={styles.signatureMention}>Pour {companyName}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Signature du client</Text>
              {report.client_signature_url ? (
                <Image src={report.client_signature_url} style={styles.signatureImage} />
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={{ fontSize: 8, color: MUTED, textAlign: 'center' }}>
                    Non disponible
                  </Text>
                </View>
              )}
              <Text style={styles.signatureName}>
                {report.client_first_name} {report.client_last_name}
              </Text>
              <Text style={styles.signatureMention}>« Bon pour accord »</Text>
            </View>
          </View>
        </View>

        <Footer />
      </Page>
    </Document>
  );
};

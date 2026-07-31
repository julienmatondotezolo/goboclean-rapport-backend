import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ROOF_REVIVE_LOGO } from './logo-roofrevive';

/**
 * Rapport d'intervention client — bilingue FR/NL, pensé pour l'impression :
 * quasi monochrome (la seule couleur vient du logo Roof Revive en haut à
 * gauche), photos avant/après appariées côte à côte, pied de page répété.
 */

const TEXT = '#111111';
const MUTED = '#555555';
const BORDER = '#cccccc';
const RULE = '#999999';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 70,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: TEXT,
    lineHeight: 1.45,
  },

  // ─── En-tête : logo à gauche, titre à droite ────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 110,
    height: 62,
    objectFit: 'contain',
  },
  reportMeta: {
    alignItems: 'flex-end',
  },
  reportTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  reportTitleNl: {
    fontSize: 9,
    color: MUTED,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  reportNumber: {
    fontSize: 9,
    color: MUTED,
    marginTop: 4,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: RULE,
    marginBottom: 16,
  },

  // ─── Sections ───────────────────────────────────────────────
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: BORDER,
  },
  sectionTitleNl: {
    fontFamily: 'Helvetica',
    color: MUTED,
  },

  twoCols: {
    flexDirection: 'row',
    gap: 20,
  },
  col: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: '42%',
    color: MUTED,
    fontSize: 8.5,
  },
  infoValue: {
    width: '58%',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  serviceDash: {
    width: 12,
    fontSize: 10,
    color: MUTED,
  },
  serviceText: {
    fontSize: 9.5,
    flex: 1,
  },
  serviceTextNl: {
    fontSize: 8,
    color: MUTED,
  },

  commentsBox: {
    borderWidth: 0.75,
    borderColor: BORDER,
    padding: 9,
    fontSize: 9.5,
    color: TEXT,
  },

  // ─── Photos appariées avant / après ─────────────────────────
  photoPairHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  photoColLabel: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    color: TEXT,
  },
  photoColLabelNl: {
    fontFamily: 'Helvetica',
    color: MUTED,
  },
  photoPairRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  photoCell: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: 165,
    objectFit: 'cover',
    borderWidth: 0.75,
    borderColor: BORDER,
  },
  photoEmpty: {
    width: '100%',
    height: 165,
    borderWidth: 0.75,
    borderColor: BORDER,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  photoCaption: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 3,
    textAlign: 'center',
  },

  // ─── Signatures ─────────────────────────────────────────────
  signaturesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: BORDER,
    padding: 10,
  },
  signatureLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  signatureLabelNl: {
    fontSize: 7.5,
    color: MUTED,
    marginBottom: 6,
  },
  signatureImage: {
    width: '100%',
    height: 65,
    objectFit: 'contain',
  },
  signaturePlaceholder: {
    height: 65,
    justifyContent: 'center',
  },
  signatureName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    marginTop: 6,
    borderTopWidth: 0.75,
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
    left: 42,
    right: 42,
  },
  footerRule: {
    borderTopWidth: 0.75,
    borderTopColor: BORDER,
    marginBottom: 5,
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

/** Libellés de services FR + NL (catalogue Roof Revive, services.json). */
const SUBTYPE_LABELS: Record<string, { fr: string; nl: string }> = {
  cleaning: { fr: 'Nettoyage', nl: 'Reiniging' },
  coating: { fr: 'Protection / traitement', nl: 'Beschermlaag' },
  repair: { fr: 'Réparation', nl: 'Herstelling' },
  inspection: { fr: 'Inspection', nl: 'Inspectie' },
  maintenance: { fr: 'Entretien', nl: 'Onderhoud' },
  demoussage: {
    fr: 'Démoussage de toiture + inspection gratuite et réparations nécessaires',
    nl: 'Dak ontmossen + gratis inspectie en nodige herstellingen',
  },
  gouttieres: { fr: 'Nettoyage des gouttières', nl: 'Goten reinigen' },
  hydrofuge_wax: {
    fr: 'Traitement hydrofuge (wax) – garantie 3 ans',
    nl: 'Beschermlaag wax voor 3 jaar garantie',
  },
  deplacement: { fr: 'Déplacement + carburant machine', nl: 'Verplaatsing en brandstof voor machine' },
  peinture_toiture: { fr: 'Peinture de toiture (anthracite)', nl: 'Dak verven (antraciet)' },
  facade: { fr: 'Nettoyage de façade', nl: 'Facades reinigen' },
  panneaux_solaires: { fr: 'Nettoyage des panneaux solaires', nl: 'Zonnepanelen reinigen' },
  nacelle: { fr: 'Location nacelle élévatrice', nl: 'Hoogtewerker huren' },
  terrasse: { fr: 'Nettoyage terrasse', nl: 'Terrassen reinigen' },
  mur: { fr: 'Nettoyage de mur', nl: 'Muur reinigen' },
  cheminee: { fr: 'Nettoyage cheminée', nl: 'Schouw reinigen' },
  piliers: { fr: 'Nettoyage piliers', nl: 'Pilaren reinigen' },
  velux: { fr: 'Nettoyage velux / vitres', nl: 'Velux / ramen reinigen' },
  driveway: { fr: 'Nettoyage allée', nl: 'Oprit reinigen' },
  escalier: { fr: 'Nettoyage escalier', nl: 'Trap reinigen' },
  evac_mousse: { fr: 'Évacuation de la mousse', nl: 'Al het mos meenemen' },
};

interface ReportPDFProps {
  report: any;
  company: any;
}

export const ReportPDF: React.FC<ReportPDFProps> = ({ report, company }) => {
  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy', { locale: fr });
  const formatTime = (date: string) => format(new Date(date), 'HH:mm', { locale: fr });

  const beforePhotos = (report.photos ?? []).filter((p: any) => p.type === 'before');
  const afterPhotos = (report.photos ?? []).filter((p: any) => p.type === 'after');
  const pairCount = Math.max(beforePhotos.length, afterPhotos.length);
  const reportNumber = report.id.slice(0, 8).toUpperCase();
  const reportDate = report.completed_at || report.created_at;
  const companyName = company?.company_name || 'Roof Revive';

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
        <Text style={styles.footerText}>
          Rapport / Verslag N° {reportNumber}
        </Text>
      </View>
    </View>
  );

  const SectionTitle = ({ frText, nlText }: { frText: string; nlText: string }) => (
    <Text style={styles.sectionTitle}>
      {frText} <Text style={styles.sectionTitleNl}>/ {nlText}</Text>
    </Text>
  );

  const InfoRow = ({ frLabel, nlLabel, value }: { frLabel: string; nlLabel: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {frLabel} / {nlLabel}
      </Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const PhotoCell = ({ photo, caption }: { photo: any; caption: string }) =>
    photo ? (
      <View style={styles.photoCell}>
        <Image src={photo.url} style={styles.photo} />
        <Text style={styles.photoCaption}>{caption}</Text>
      </View>
    ) : (
      <View style={styles.photoCell}>
        <View style={styles.photoEmpty}>
          <Text style={{ fontSize: 7.5, color: MUTED, textAlign: 'center' }}>—</Text>
        </View>
      </View>
    );

  return (
    <Document
      title={`Rapport d'intervention / Interventieverslag ${reportNumber}`}
      author={companyName}
      subject={`Intervention du ${formatDate(reportDate)}`}
    >
      <Page size="A4" style={styles.page}>
        {/* En-tête : logo Roof Revive à gauche, titre à droite */}
        <View style={styles.header}>
          <Image src={ROOF_REVIVE_LOGO} style={styles.logo} />
          <View style={styles.reportMeta}>
            <Text style={styles.reportTitle}>Rapport d'intervention</Text>
            <Text style={styles.reportTitleNl}>Interventieverslag</Text>
            <Text style={styles.reportNumber}>
              N° {reportNumber} · {formatDate(reportDate)}
            </Text>
          </View>
        </View>
        <View style={styles.headerRule} />

        {/* Client & intervention */}
        <View style={[styles.section, styles.twoCols]}>
          <View style={styles.col}>
            <SectionTitle frText="Client" nlText="Klant" />
            <InfoRow
              frLabel="Nom"
              nlLabel="Naam"
              value={`${report.client_first_name} ${report.client_last_name}`}
            />
            <InfoRow frLabel="Adresse" nlLabel="Adres" value={report.client_address} />
            {report.client_phone ? (
              <InfoRow frLabel="Téléphone" nlLabel="Telefoon" value={report.client_phone} />
            ) : null}
          </View>

          <View style={styles.col}>
            <SectionTitle frText="Intervention" nlText="Interventie" />
            {report.appointment_time ? (
              <InfoRow frLabel="Date" nlLabel="Datum" value={formatDate(report.appointment_time)} />
            ) : null}
            {report.started_at ? (
              <InfoRow frLabel="Début" nlLabel="Start" value={formatTime(report.started_at)} />
            ) : null}
            {report.completed_at ? (
              <InfoRow frLabel="Fin" nlLabel="Einde" value={formatTime(report.completed_at)} />
            ) : null}
            {report.surface_area ? (
              <InfoRow frLabel="Surface" nlLabel="Oppervlakte" value={`${report.surface_area} m²`} />
            ) : null}
            {report.worker ? (
              <InfoRow
                frLabel="Technicien"
                nlLabel="Technicus"
                value={`${report.worker.first_name} ${report.worker.last_name}`}
              />
            ) : null}
          </View>
        </View>

        {/* Services effectués */}
        {report.mission_subtypes?.length > 0 && (
          <View style={styles.section}>
            <SectionTitle frText="Services effectués" nlText="Uitgevoerde diensten" />
            {report.mission_subtypes.map((st: string) => {
              const labels = SUBTYPE_LABELS[st] ?? { fr: st, nl: st };
              return (
                <View key={st} style={styles.serviceRow}>
                  <Text style={styles.serviceDash}>–</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceText}>{labels.fr}</Text>
                    <Text style={styles.serviceTextNl}>{labels.nl}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Observations */}
        {report.comments ? (
          <View style={styles.section}>
            <SectionTitle frText="Observations du technicien" nlText="Opmerkingen van de technicus" />
            <View style={styles.commentsBox}>
              <Text>{report.comments}</Text>
            </View>
          </View>
        ) : null}

        {/* Photos avant / après appariées */}
        {pairCount > 0 && (
          <View style={styles.section}>
            <SectionTitle frText="Photos avant / après" nlText="Foto's voor / na" />
            <View style={styles.photoPairHeader}>
              <Text style={styles.photoColLabel}>
                Avant <Text style={styles.photoColLabelNl}>/ Voor</Text>
              </Text>
              <Text style={styles.photoColLabel}>
                Après <Text style={styles.photoColLabelNl}>/ Na</Text>
              </Text>
            </View>
            {Array.from({ length: pairCount }, (_, i) => (
              <View key={i} style={styles.photoPairRow} wrap={false}>
                <PhotoCell photo={beforePhotos[i]} caption={`Avant / Voor — ${i + 1}`} />
                <PhotoCell photo={afterPhotos[i]} caption={`Après / Na — ${i + 1}`} />
              </View>
            ))}
          </View>
        )}

        {/* Signatures */}
        <View style={styles.section} wrap={false}>
          <SectionTitle frText="Validation" nlText="Validatie" />
          <View style={styles.signaturesRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Signature du technicien</Text>
              <Text style={styles.signatureLabelNl}>Handtekening technicus</Text>
              {report.worker_signature_url ? (
                <Image src={report.worker_signature_url} style={styles.signatureImage} />
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={{ fontSize: 8, color: MUTED, textAlign: 'center' }}>—</Text>
                </View>
              )}
              <Text style={styles.signatureName}>
                {report.worker ? `${report.worker.first_name} ${report.worker.last_name}` : '—'}
              </Text>
              <Text style={styles.signatureMention}>Pour {companyName} / Voor {companyName}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Signature du client</Text>
              <Text style={styles.signatureLabelNl}>Handtekening klant</Text>
              {report.client_signature_url ? (
                <Image src={report.client_signature_url} style={styles.signatureImage} />
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={{ fontSize: 8, color: MUTED, textAlign: 'center' }}>—</Text>
                </View>
              )}
              <Text style={styles.signatureName}>
                {report.client_first_name} {report.client_last_name}
              </Text>
              <Text style={styles.signatureMention}>« Bon pour accord » / « Voor akkoord »</Text>
            </View>
          </View>
        </View>

        <Footer />
      </Page>
    </Document>
  );
};

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  Svg,
  Path,
  Rect,
} from '@react-pdf/renderer';
import type { FullExportData } from './project-excel';

/**
 * Digital Prospectus PDF.
 *
 * Generated server-side with react-pdf. Includes:
 *   - Cover page with project hero image, name, location
 *   - Project details + pricing
 *   - Renderings gallery
 *   - Neighborhood demographics
 *   - Competitive landscape
 *   - AI market report (formatted from HTML)
 *
 * BRANDING:
 *   - Uses Heebo font (Hebrew + Latin) loaded via Google Fonts
 *   - Primary color matches brand (#5b49c0)
 *   - Clean, magazine-style layout
 *   - Dark sidebar with logo on every page
 *
 * HEBREW HANDLING:
 *   - react-pdf doesn't have real RTL support, but we can work around by:
 *     * Using Heebo font (designed for Hebrew)
 *     * Right-aligning text
 *     * For mixed LTR/RTL (prices, numbers) we bidi-isolate via Unicode markers
 */

// ---------------------------------------------------------------------------
// FONT REGISTRATION
// ---------------------------------------------------------------------------

Font.register({
  family: 'Heebo',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H4TbIxA8h_TyY.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H4TbIxI8Z_TyY.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H4TbIxM8V_TyY.ttf',
      fontWeight: 700,
    },
  ],
});

// Disable hyphenation - Hebrew doesn't use it, and the default algorithm
// mangles Hebrew words
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// THEME
// ---------------------------------------------------------------------------

const COLORS = {
  primary: '#5b49c0',
  primaryLight: '#f4f2ff',
  text: '#1a1a2e',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  success: '#16a34a',
  warning: '#d97706',
  bg: '#ffffff',
  bgAlt: '#fafafa',
  sidebarBg: '#1e1b4b',
  sidebarText: '#c7d2fe',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Heebo',
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    lineHeight: 1.5,
  },
  coverPage: {
    fontFamily: 'Heebo',
    color: COLORS.text,
    padding: 0,
    backgroundColor: COLORS.bg,
  },
  // Header with branded bar
  pageHeader: {
    position: 'absolute',
    top: 20,
    left: 50,
    right: 50,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandName: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.primary,
  },
  pageHeaderRight: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  // Footer
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    fontSize: 8,
    color: COLORS.textMuted,
  },
  // Typography
  h1: {
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.text,
    marginBottom: 6,
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.primary,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    textAlign: 'right',
  },
  h3: {
    fontSize: 12,
    fontWeight: 500,
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 5,
    textAlign: 'right',
  },
  body: {
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'right',
    marginBottom: 6,
  },
  muted: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  // Cover
  coverHero: {
    height: '55%',
    width: '100%',
    backgroundColor: COLORS.primary,
    position: 'relative',
  },
  coverHeroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 75, 0.35)',
  },
  coverBrand: {
    position: 'absolute',
    top: 40,
    right: 50,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  coverBrandText: {
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
    marginLeft: 8,
  },
  coverBody: {
    padding: 50,
  },
  coverLabel: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 500,
    marginBottom: 8,
    letterSpacing: 1.5,
    textAlign: 'right',
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'right',
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginBottom: 30,
  },
  coverMeta: {
    flexDirection: 'row-reverse',
    gap: 40,
    marginTop: 30,
  },
  coverMetaItem: {
    flexDirection: 'column',
  },
  coverMetaLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 2,
    textAlign: 'right',
  },
  coverMetaValue: {
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.text,
    textAlign: 'right',
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginVertical: 15,
  },
  statCard: {
    flex: 1,
    padding: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 4,
    textAlign: 'right',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.primary,
    textAlign: 'right',
  },
  // Table
  table: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  tableRowHeader: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 8,
    backgroundColor: COLORS.primaryLight,
  },
  tableRowSelf: {
    backgroundColor: COLORS.primaryLight,
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.primary,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  // Gallery
  gallery: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  galleryImage: {
    width: '48%',
    height: 120,
    objectFit: 'cover',
    borderRadius: 6,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  // AI report
  aiReportBox: {
    padding: 14,
    backgroundColor: COLORS.bgAlt,
    borderRightWidth: 3,
    borderRightColor: COLORS.primary,
    borderRadius: 4,
    marginTop: 10,
  },
  // Badges for deltas
  deltaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
  },
});

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  // Use LRM (left-to-right mark) around number to prevent RTL from flipping digits
  return `\u200E${value.toLocaleString('he-IL')} ₪\u200E`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n【$1】\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n— $1 —\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<\/?(p|ul|ol)[^>]*>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// DOCUMENT
// ---------------------------------------------------------------------------

export interface ProspectusProps {
  data: FullExportData & {
    media?: Array<{ url: string; isCover: boolean; type: string }>;
  };
  brandName: string;
  logoText?: string;
}

export function ProspectusDocument({ data, brandName, logoText }: ProspectusProps) {
  const coverImage = data.media?.find((m) => m.isCover) ?? data.media?.[0];
  const galleryImages = (data.media ?? [])
    .filter((m) => !m.isCover || data.media!.length === 1)
    .slice(0, 4);

  const selfPrice = data.project.price_per_sqm_avg;
  const topCompetitors = data.competitors.slice(0, 5);

  return (
    <Document
      title={`פרוספקט — ${data.project.name}`}
      author={data.generatedBy}
      creator={brandName}
    >
      {/* ============== COVER PAGE ============== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHero}>
          {coverImage ? (
            <>
              <Image style={styles.coverHeroImage} src={coverImage.url} />
              <View style={styles.coverOverlay} />
            </>
          ) : (
            <View style={[styles.coverHeroImage, { backgroundColor: COLORS.primary }]} />
          )}
          <View style={styles.coverBrand}>
            <Text style={styles.coverBrandText}>{logoText ?? brandName}</Text>
            <BrandMark />
          </View>
        </View>

        <View style={styles.coverBody}>
          <Text style={styles.coverLabel}>פרוספקט דיגיטלי</Text>
          <Text style={styles.coverTitle}>{data.project.name}</Text>
          <Text style={styles.coverSubtitle}>
            {[data.project.neighborhood, data.project.city].filter(Boolean).join(', ')}
          </Text>

          <View style={styles.coverMeta}>
            {data.project.total_units != null && (
              <View style={styles.coverMetaItem}>
                <Text style={styles.coverMetaLabel}>יחידות</Text>
                <Text style={styles.coverMetaValue}>{data.project.total_units}</Text>
              </View>
            )}
            {data.project.floors != null && (
              <View style={styles.coverMetaItem}>
                <Text style={styles.coverMetaLabel}>קומות</Text>
                <Text style={styles.coverMetaValue}>{data.project.floors}</Text>
              </View>
            )}
            {data.project.expected_completion_date && (
              <View style={styles.coverMetaItem}>
                <Text style={styles.coverMetaLabel}>סיום צפוי</Text>
                <Text style={styles.coverMetaValue}>
                  {formatDate(data.project.expected_completion_date)}
                </Text>
              </View>
            )}
            {data.project.developer_name && (
              <View style={styles.coverMetaItem}>
                <Text style={styles.coverMetaLabel}>יזם</Text>
                <Text style={styles.coverMetaValue}>{data.project.developer_name}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.pageFooter}>
          <Text>
            {brandName} · נוצר ב-{formatDate(data.generatedAt.toISOString())}
          </Text>
          <Text>עמוד 1</Text>
        </View>
      </Page>

      {/* ============== OVERVIEW PAGE ============== */}
      <Page size="A4" style={styles.page}>
        <PageHeader brandName={brandName} section="סקירת פרויקט" />

        <Text style={styles.h2}>סקירה כללית</Text>

        {data.project.description && (
          <Text style={styles.body}>{data.project.description}</Text>
        )}

        {/* Key stats */}
        <View style={styles.statsGrid}>
          {data.project.price_min != null && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>החל מ-</Text>
              <Text style={styles.statValue}>{formatCurrency(data.project.price_min)}</Text>
            </View>
          )}
          {data.project.price_per_sqm_avg != null && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ממוצע למ"ר</Text>
              <Text style={styles.statValue}>
                {formatCurrency(data.project.price_per_sqm_avg)}
              </Text>
            </View>
          )}
          {data.project.total_units != null && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>יחידות</Text>
              <Text style={styles.statValue}>{data.project.total_units}</Text>
            </View>
          )}
        </View>

        <Text style={styles.h3}>פרטי הפרויקט</Text>
        <InfoRow label="מיקום" value={[data.project.neighborhood, data.project.city].filter(Boolean).join(', ')} />
        {data.project.address && <InfoRow label="כתובת" value={data.project.address} />}
        {data.project.developer_name && <InfoRow label="יזם" value={data.project.developer_name} />}
        {data.project.construction_start_date && (
          <InfoRow label="תחילת בנייה" value={formatDate(data.project.construction_start_date)} />
        )}
        {data.project.expected_completion_date && (
          <InfoRow label="סיום צפוי" value={formatDate(data.project.expected_completion_date)} />
        )}

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <>
            <Text style={styles.h3}>הדמיות</Text>
            <View style={styles.gallery}>
              {galleryImages.map((m, i) => (
                <Image key={i} style={styles.galleryImage} src={m.url} />
              ))}
            </View>
          </>
        )}

        <PageFooter brandName={brandName} pageNumber={2} />
      </Page>

      {/* ============== NEIGHBORHOOD PAGE ============== */}
      {data.demographics && (
        <Page size="A4" style={styles.page}>
          <PageHeader brandName={brandName} section="ניתוח סביבתי" />

          <Text style={styles.h2}>ניתוח סביבתי</Text>
          <Text style={styles.muted}>מקורות: הלמ"ס, משרד החינוך</Text>

          <View style={styles.statsGrid}>
            {data.demographics.socioeconomicCluster != null && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>אשכול חברתי-כלכלי</Text>
                <Text style={styles.statValue}>
                  {data.demographics.socioeconomicCluster} / 10
                </Text>
              </View>
            )}
            {data.demographics.avgSchoolRating != null && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ממוצע דירוג חינוך</Text>
                <Text style={styles.statValue}>
                  {data.demographics.avgSchoolRating.toFixed(1)} / 10
                </Text>
              </View>
            )}
            {data.demographics.totalPopulation != null && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>אוכלוסייה</Text>
                <Text style={styles.statValue}>
                  {data.demographics.totalPopulation.toLocaleString('he-IL')}
                </Text>
              </View>
            )}
          </View>

          {/* Age distribution */}
          {data.demographics.ageDistribution && (
            <>
              <Text style={styles.h3}>התפלגות גילאים</Text>
              <AgeDistributionBars dist={data.demographics.ageDistribution} />
            </>
          )}

          {/* Schools */}
          {data.demographics.schools.length > 0 && (
            <>
              <Text style={styles.h3}>בתי ספר באזור</Text>
              <View style={styles.table}>
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCellHeader, { flex: 3 }]}>שם</Text>
                  <Text style={[styles.tableCellHeader, { flex: 1 }]}>שלב</Text>
                  <Text style={[styles.tableCellHeader, { flex: 1, textAlign: 'center' }]}>
                    דירוג
                  </Text>
                </View>
                {data.demographics.schools.slice(0, 8).map((s, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 3 }]}>{s.name}</Text>
                    <Text style={[styles.tableCell, { flex: 1, color: COLORS.textMuted }]}>
                      {s.level === 'elementary'
                        ? 'יסודי'
                        : s.level === 'middle'
                          ? 'חט"ב'
                          : s.level === 'high'
                            ? 'תיכון'
                            : 'אחר'}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1, textAlign: 'center', fontWeight: 500 },
                      ]}
                    >
                      {s.ratingOutOf10}/10
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <PageFooter brandName={brandName} pageNumber={3} />
        </Page>
      )}

      {/* ============== COMPETITORS PAGE ============== */}
      {topCompetitors.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PageHeader brandName={brandName} section="השוואת שוק" />

          <Text style={styles.h2}>השוואה תחרותית</Text>
          <Text style={styles.muted}>
            מתחרים באזור שזוהו בסריקה דינמית. פער חיובי = מתחרה יקר יותר (יתרון).
          </Text>

          <View style={[styles.table, { marginTop: 15 }]}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>פרויקט</Text>
              <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>משווק</Text>
              <Text
                style={[styles.tableCellHeader, { flex: 1.2, textAlign: 'left' }]}
              >
                החל מ-
              </Text>
              <Text
                style={[styles.tableCellHeader, { flex: 1.2, textAlign: 'left' }]}
              >
                למ"ר
              </Text>
              <Text
                style={[styles.tableCellHeader, { flex: 0.8, textAlign: 'center' }]}
              >
                פער
              </Text>
            </View>

            {/* Self row */}
            <View style={[styles.tableRow, styles.tableRowSelf]}>
              <Text style={[styles.tableCell, { flex: 3, fontWeight: 700, color: COLORS.primary }]}>
                ★ {data.project.name}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.textMuted }]}>
                {data.project.developer_name ?? '—'}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'left' }]}>
                {formatCurrency(data.project.price_min)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 1.2, textAlign: 'left', fontWeight: 500 },
                ]}
              >
                {formatCurrency(selfPrice)}
              </Text>
              <Text
                style={[styles.tableCell, { flex: 0.8, textAlign: 'center', color: COLORS.textMuted }]}
              >
                בסיס
              </Text>
            </View>

            {/* Competitor rows */}
            {topCompetitors.map((c, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{c.name}</Text>
                <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.textMuted }]}>
                  {c.marketer ?? '—'}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'left' }]}>
                  {formatCurrency(c.startingPrice)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'left' }]}>
                  {formatCurrency(c.pricePerSqm)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      flex: 0.8,
                      textAlign: 'center',
                      fontWeight: 500,
                      color:
                        c.deltaPct == null
                          ? COLORS.textMuted
                          : c.deltaPct > 0
                            ? COLORS.success
                            : COLORS.warning,
                    },
                  ]}
                >
                  {c.deltaPct != null
                    ? `${c.deltaPct > 0 ? '+' : ''}${c.deltaPct.toFixed(1)}%`
                    : '—'}
                </Text>
              </View>
            ))}
          </View>

          <PageFooter brandName={brandName} pageNumber={4} />
        </Page>
      )}

      {/* ============== AI REPORT PAGE ============== */}
      {data.aiReportText && (
        <Page size="A4" style={styles.page}>
          <PageHeader brandName={brandName} section="ניתוח AI" />

          <Text style={styles.h2}>ניתוח וההמלצות</Text>
          <Text style={styles.muted}>סיכום אוטומטי המבוסס על כל הנתונים שנאספו</Text>

          <View style={styles.aiReportBox}>
            <Text style={[styles.body, { lineHeight: 1.7 }]}>
              {stripHtml(data.aiReportText)}
            </Text>
          </View>

          <PageFooter brandName={brandName} pageNumber={5} />
        </Page>
      )}
    </Document>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENTS
// ---------------------------------------------------------------------------

function PageHeader({ brandName, section }: { brandName: string; section: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <Text style={styles.brandName}>{brandName}</Text>
      <Text style={styles.pageHeaderRight}>{section}</Text>
    </View>
  );
}

function PageFooter({ brandName, pageNumber }: { brandName: string; pageNumber: number }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>{brandName} · פרוספקט דיגיטלי</Text>
      <Text render={({ pageNumber: pn }) => `עמוד ${pn}`} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
      }}
    >
      <Text style={{ fontSize: 9, color: COLORS.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 10, fontWeight: 500, textAlign: 'right', flex: 1, marginRight: 20 }}>
        {value}
      </Text>
    </View>
  );
}

function AgeDistributionBars({
  dist,
}: {
  dist: {
    youth: number;
    youngAdults: number;
    middleAged: number;
    seniors: number;
    elderly: number;
  };
}) {
  const total = dist.youth + dist.youngAdults + dist.middleAged + dist.seniors + dist.elderly;
  if (total === 0) return null;

  const groups = [
    { label: '0-17', value: dist.youth, color: '#3b82f6' },
    { label: '18-34', value: dist.youngAdults, color: COLORS.primary },
    { label: '35-54', value: dist.middleAged, color: '#16a34a' },
    { label: '55-74', value: dist.seniors, color: '#d97706' },
    { label: '75+', value: dist.elderly, color: '#6b7280' },
  ];

  return (
    <View style={{ marginTop: 8 }}>
      {groups.map((g, i) => {
        const pct = Math.round((g.value / total) * 100);
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              marginBottom: 6,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 9, width: 45, textAlign: 'right' }}>{g.label}</Text>
            <View
              style={{
                flex: 1,
                height: 14,
                backgroundColor: COLORS.bgAlt,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: g.color,
                }}
              />
            </View>
            <Text style={{ fontSize: 9, width: 40, textAlign: 'left', fontWeight: 500 }}>
              {pct}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function BrandMark() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Rect x={2} y={2} width={20} height={20} rx={4} fill="#fff" opacity={0.2} />
      <Path
        d="M6 18 L6 10 L12 6 L18 10 L18 18 M10 18 L10 13 L14 13 L14 18"
        stroke="#fff"
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
}

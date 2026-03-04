import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Report, Recommendation } from '@/lib/types';

const palette = {
  black: '#0f172a',
  dark: '#1e293b',
  medium: '#475569',
  light: '#94a3b8',
  border: '#e2e8f0',
  bg: '#f8fafc',
  blue: '#2563eb',
  blueLight: '#dbeafe',
  green: '#16a34a',
  greenLight: '#dcfce7',
  amber: '#d97706',
  amberLight: '#fef3c7',
  red: '#dc2626',
  redLight: '#fee2e2',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    padding: 40,
    fontSize: 10,
    color: palette.dark,
  },
  // Header
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `1 solid ${palette.border}`,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 8,
    color: palette.blue,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  domainText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: palette.black,
  },
  metaText: {
    fontSize: 9,
    color: palette.light,
    marginTop: 2,
  },
  // Score row
  scoreRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  scoreBox: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
  },
  scoreTag: {
    fontSize: 7,
    marginTop: 2,
  },
  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: palette.black,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `1 solid ${palette.border}`,
  },
  // Text
  body: {
    fontSize: 10,
    color: palette.medium,
    lineHeight: 1.5,
  },
  // Checklist
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 6,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 1,
  },
  checkLabel: {
    fontSize: 10,
    flex: 1,
  },
  // Recommendation card
  recCard: {
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    backgroundColor: palette.bg,
    border: `1 solid ${palette.border}`,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  recTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: palette.black,
    flex: 1,
    marginRight: 8,
  },
  recBadgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 5,
  },
  badge: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  recDesc: {
    fontSize: 9,
    color: palette.medium,
    lineHeight: 1.5,
  },
  // Grid
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  // Tech badge
  techBadge: {
    backgroundColor: palette.bg,
    border: `1 solid ${palette.border}`,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 9,
    marginRight: 4,
    marginBottom: 4,
  },
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: `1 solid ${palette.border}`,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: palette.light,
  },
});

function scoreColor(score: number) {
  if (score >= 75) return palette.green;
  if (score >= 50) return palette.amber;
  return palette.red;
}

function scoreBg(score: number) {
  if (score >= 75) return palette.greenLight;
  if (score >= 50) return palette.amberLight;
  return palette.redLight;
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Needs Work';
  return 'Poor';
}

function impactBg(impact: string) {
  if (impact === 'High') return palette.redLight;
  if (impact === 'Medium') return palette.amberLight;
  return palette.bg;
}

function impactText(impact: string) {
  if (impact === 'High') return palette.red;
  if (impact === 'Medium') return palette.amber;
  return palette.medium;
}

function effortBg(effort: string) {
  if (effort === 'Low') return palette.greenLight;
  if (effort === 'Medium') return palette.blueLight;
  return palette.purpleLight;
}

function effortText(effort: string) {
  if (effort === 'Low') return palette.green;
  if (effort === 'Medium') return palette.blue;
  return palette.purple;
}

function RecCardPDF({ rec, rank }: { rec: Recommendation; rank: number }) {
  return (
    <View style={styles.recCard}>
      <View style={styles.recHeader}>
        <Text style={styles.recTitle}>
          {rank}. {rec.title}
        </Text>
      </View>
      <View style={styles.recBadgeRow}>
        <Text style={[styles.badge, { backgroundColor: palette.blueLight, color: palette.blue }]}>
          {rec.category}
        </Text>
        <Text style={[styles.badge, { backgroundColor: impactBg(rec.impact), color: impactText(rec.impact) }]}>
          {rec.impact} Impact
        </Text>
        <Text style={[styles.badge, { backgroundColor: effortBg(rec.effort), color: effortText(rec.effort) }]}>
          {rec.effort} Effort
        </Text>
      </View>
      <Text style={styles.recDesc}>{rec.description}</Text>
    </View>
  );
}

interface Props {
  report: Report;
}

export function ReportPDF({ report }: Props) {
  const { siteMetrics: m, scores, recommendations, aiInsights } = report;
  const home = m.crawledPages[0];
  const scanDate = new Date(report.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Document
      title={`SiteScope Report — ${report.domain}`}
      author="SiteScope"
      subject="Website Intelligence Report"
    >
      {/* Page 1: Overview + Scores */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.brandText}>SiteScope · Website Intelligence Report</Text>
              <Text style={styles.domainText}>{report.domain}</Text>
              <Text style={styles.metaText}>
                {report.url} · Scanned {scanDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Scores with visual bars */}
        <View style={styles.scoreRow}>
          {[
            { label: 'Overall', score: scores.overall },
            { label: 'Messaging', score: scores.messaging },
            { label: 'SEO', score: scores.seo },
            { label: 'CRO', score: scores.cro },
            { label: 'A11y', score: scores.accessibility },
          ].map(({ label, score }) => (
            <View key={label} style={[styles.scoreBox, { backgroundColor: scoreBg(score) }]}>
              <Text style={[styles.scoreLabel, { color: scoreColor(score) }]}>{label}</Text>
              <Text style={[styles.scoreValue, { color: scoreColor(score) }]}>{score}</Text>
              {/* Score bar */}
              <View style={{ width: '100%', height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginTop: 4 }}>
                <View style={{ width: `${score}%`, height: 4, backgroundColor: scoreColor(score), borderRadius: 2 }} />
              </View>
              <Text style={[styles.scoreTag, { color: scoreColor(score) }]}>{scoreLabel(score)}</Text>
            </View>
          ))}
        </View>

        {/* AI Summary */}
        {aiInsights && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            <Text style={styles.body}>{aiInsights.executiveSummary}</Text>
            {aiInsights.targetAudience && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.body, { fontFamily: 'Helvetica-Bold', color: palette.dark, marginBottom: 2 }]}>
                  Target Audience
                </Text>
                <Text style={styles.body}>{aiInsights.targetAudience}</Text>
              </View>
            )}
          </View>
        )}

        {/* Accessibility summary */}
        {home && (
          <View style={[styles.section, { marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>Accessibility Snapshot</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {[
                { label: 'Images with alt', value: String(home.accessibility?.imagesWithAlt ?? 0), ok: true },
                { label: 'Missing alt text', value: String(home.accessibility?.imagesWithoutAlt ?? 0), ok: (home.accessibility?.imagesWithoutAlt ?? 0) === 0 },
                { label: 'Heading issues', value: String(home.accessibility?.headingOrderIssues ?? 0), ok: (home.accessibility?.headingOrderIssues ?? 0) === 0 },
                { label: 'ARIA elements', value: String(home.accessibility?.ariaLabels ?? 0), ok: (home.accessibility?.ariaLabels ?? 0) > 0 },
                { label: 'Lang attribute', value: home.accessibility?.missingLangAttr ? 'Missing' : 'Present', ok: !home.accessibility?.missingLangAttr },
              ].map(({ label, value, ok }) => (
                <View key={label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: ok ? palette.green : palette.red }}>{value}</Text>
                  <Text style={{ fontSize: 7, color: palette.medium, textAlign: 'center', marginTop: 2 }}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Site checklist */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Site Health</Text>
            {[
              { label: 'Sitemap.xml present', pass: m.hasSitemap },
              { label: 'Robots.txt accessible', pass: m.hasRobotsTxt },
              { label: 'H1 on homepage', pass: (home?.h1.length ?? 0) > 0 },
              { label: 'Title tag set', pass: !!home?.title },
              { label: 'Meta description', pass: !!home?.metaDescription },
              { label: 'Canonical tag', pass: !!home?.canonical },
              { label: 'CTA on homepage', pass: (home?.ctaCandidates.length ?? 0) > 0 },
              { label: 'Pricing page', pass: m.hasPricingPage },
              { label: 'Contact page', pass: m.hasContactPage },
            ].map(({ label, pass }) => (
              <View key={label} style={styles.checkRow}>
                <View
                  style={[
                    styles.checkDot,
                    { backgroundColor: pass ? palette.green : palette.red },
                  ]}
                />
                <Text style={[styles.checkLabel, { color: pass ? palette.dark : palette.light }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Site Stats</Text>
            {[
              ['Pages crawled', m.pagesCount],
              ['Total words', m.totalWords.toLocaleString()],
              ['Images', m.totalImages],
              ['Scripts', m.totalScripts],
              ['Internal links', m.uniqueInternalLinks],
              ['Crawl time', `${(m.crawlDurationMs / 1000).toFixed(1)}s`],
            ].map(([label, val]) => (
              <View key={String(label)} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[styles.body, { color: palette.medium }]}>{label}</Text>
                <Text style={[styles.body, { fontFamily: 'Helvetica-Bold', color: palette.dark }]}>{val}</Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Tech Stack</Text>
            {m.techStack.cms.length > 0 && (
              <View style={{ marginBottom: 4 }}>
                <Text style={[styles.body, { color: palette.medium, marginBottom: 2 }]}>CMS</Text>
                <View style={styles.techRow}>
                  {m.techStack.cms.map((t) => (
                    <Text key={t} style={styles.techBadge}>{t}</Text>
                  ))}
                </View>
              </View>
            )}
            {m.techStack.frameworks.length > 0 && (
              <View style={{ marginBottom: 4 }}>
                <Text style={[styles.body, { color: palette.medium, marginBottom: 2 }]}>Frameworks</Text>
                <View style={styles.techRow}>
                  {m.techStack.frameworks.map((t) => (
                    <Text key={t} style={styles.techBadge}>{t}</Text>
                  ))}
                </View>
              </View>
            )}
            {m.techStack.trackers.length > 0 && (
              <View>
                <Text style={[styles.body, { color: palette.medium, marginBottom: 2 }]}>Tracking</Text>
                <View style={styles.techRow}>
                  {m.techStack.trackers.slice(0, 4).map((t) => (
                    <Text key={t} style={styles.techBadge}>{t}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>SiteScope — sitescope.app</Text>
          <Text style={styles.footerText}>{report.domain} · {scanDate}</Text>
        </View>
      </Page>

      {/* Page 2: Recommendations */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brandText}>SiteScope · Recommendations</Text>
          <Text style={[styles.metaText, { marginTop: 2 }]}>{report.domain}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Top {recommendations.length} Prioritized Recommendations
          </Text>
          {recommendations.map((rec, i) => (
            <RecCardPDF key={rec.id} rec={rec} rank={i + 1} />
          ))}
        </View>

        {aiInsights && aiInsights.aiRecommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI-Generated Insights</Text>
            {aiInsights.aiRecommendations.map((rec, i) => (
              <RecCardPDF key={rec.id} rec={rec} rank={recommendations.length + i + 1} />
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>SiteScope — sitescope.app</Text>
          <Text style={styles.footerText}>Results are best-effort based on public page crawl</Text>
        </View>
      </Page>
    </Document>
  );
}

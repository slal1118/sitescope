import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { MOCK_REPORT } from '@/lib/mock-report';
import type { Report, Recommendation } from '@/lib/types';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const C = {
  black: '#0f172a',
  dark: '#1e293b',
  medium: '#475569',
  light: '#94a3b8',
  border: '#e2e8f0',
  bg: '#f8fafc',
  blue: '#2563eb',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function scoreColor(s: number) { return s >= 75 ? C.green : s >= 50 ? C.amber : C.red; }
function scoreLabel(s: number) { return s >= 80 ? 'Excellent' : s >= 65 ? 'Good' : s >= 45 ? 'Needs Work' : 'Poor'; }
function impactColor(i: string) { return i === 'High' ? C.red : i === 'Medium' ? C.amber : C.medium; }
function effortColor(e: string) { return e === 'Low' ? C.green : e === 'Medium' ? C.blue : '#7c3aed'; }

async function generatePDF(report: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { siteMetrics: m, scores, recommendations, aiInsights } = report;
    const home = m.crawledPages[0];
    const scanDate = new Date(report.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const pageW = 515; // usable width (595 - 80 margin)

    // ── PAGE 1 ────────────────────────────────────────────────────────────────

    // Header
    doc.fillColor(C.blue).fontSize(8).font('Helvetica-Bold')
      .text('SITESCOPE · WEBSITE INTELLIGENCE REPORT', 40, 40);
    doc.fillColor(C.black).fontSize(18).font('Helvetica-Bold')
      .text(report.domain, 40, 52);
    doc.fillColor(C.light).fontSize(9).font('Helvetica')
      .text(`${report.url}  ·  Scanned ${scanDate}`, 40, 74);
    doc.moveTo(40, 90).lineTo(555, 90).strokeColor(C.border).lineWidth(0.5).stroke();

    // Score boxes
    const scoreItems = [
      { label: 'Overall', score: scores.overall },
      { label: 'Messaging', score: scores.messaging },
      { label: 'SEO', score: scores.seo },
      { label: 'CRO', score: scores.cro },
      { label: 'A11y', score: scores.accessibility },
    ];
    const boxW = (pageW - 40) / scoreItems.length;
    const boxY = 98;
    scoreItems.forEach(({ label, score }, i) => {
      const x = 40 + i * (boxW + 10);
      const col = scoreColor(score);
      const [r, g, b] = hexToRgb(col);
      // light bg
      doc.rect(x, boxY, boxW, 58).fillColor([r, g, b, 0.12] as unknown as string).fill();
      doc.fillColor(col).fontSize(7).font('Helvetica-Bold').text(label.toUpperCase(), x, boxY + 6, { width: boxW, align: 'center' });
      doc.fillColor(col).fontSize(22).font('Helvetica-Bold').text(String(score), x, boxY + 16, { width: boxW, align: 'center' });
      // bar
      const barY = boxY + 42;
      doc.rect(x + 6, barY, boxW - 12, 3).fillColor(C.border).fill();
      doc.rect(x + 6, barY, (boxW - 12) * score / 100, 3).fillColor(col).fill();
      doc.fillColor(col).fontSize(7).font('Helvetica').text(scoreLabel(score), x, boxY + 48, { width: boxW, align: 'center' });
    });

    let y = boxY + 68;

    // AI Summary
    if (aiInsights) {
      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold')
        .text('Executive Summary', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      y += 18;
      doc.fillColor(C.medium).fontSize(9).font('Helvetica')
        .text(aiInsights.executiveSummary, 40, y, { width: pageW, lineGap: 2 });
      y = doc.y + 6;
      if (aiInsights.targetAudience) {
        doc.fillColor(C.dark).fontSize(9).font('Helvetica-Bold').text('Target Audience', 40, y);
        y += 13;
        doc.fillColor(C.medium).fontSize(9).font('Helvetica')
          .text(aiInsights.targetAudience, 40, y, { width: pageW, lineGap: 2 });
        y = doc.y + 6;
      }
    }

    // Accessibility Snapshot
    if (home?.accessibility) {
      const a = home.accessibility;
      const snapItems = [
        { label: 'Images w/ alt', value: String(a.imagesWithAlt), ok: true },
        { label: 'Missing alt', value: String(a.imagesWithoutAlt), ok: a.imagesWithoutAlt === 0 },
        { label: 'Heading issues', value: String(a.headingOrderIssues), ok: a.headingOrderIssues === 0 },
        { label: 'ARIA elements', value: String(a.ariaLabels), ok: a.ariaLabels > 0 },
        { label: 'Lang attribute', value: a.missingLangAttr ? 'Missing' : 'Present', ok: !a.missingLangAttr },
      ];
      y += 4;
      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Accessibility Snapshot', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      y += 20;
      const snapW = pageW / snapItems.length;
      snapItems.forEach(({ label, value, ok }, i) => {
        const x = 40 + i * snapW;
        doc.fillColor(ok ? C.green : C.red).fontSize(16).font('Helvetica-Bold')
          .text(value, x, y, { width: snapW, align: 'center' });
        doc.fillColor(C.medium).fontSize(7).font('Helvetica')
          .text(label, x, y + 18, { width: snapW, align: 'center' });
      });
      y += 36;
    }

    // Two columns: Site Health + Site Stats
    y += 8;
    const colW = (pageW - 16) / 2;
    const col1x = 40;
    const col2x = 40 + colW + 16;

    doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Site Health', col1x, y);
    doc.moveTo(col1x, y + 14).lineTo(col1x + colW, y + 14).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Site Stats', col2x, y);
    doc.moveTo(col2x, y + 14).lineTo(col2x + colW, y + 14).strokeColor(C.border).lineWidth(0.5).stroke();
    y += 20;

    const checks = [
      { label: 'Sitemap.xml present', pass: m.hasSitemap },
      { label: 'Robots.txt accessible', pass: m.hasRobotsTxt },
      { label: 'H1 on homepage', pass: (home?.h1.length ?? 0) > 0 },
      { label: 'Title tag set', pass: !!home?.title },
      { label: 'Meta description', pass: !!home?.metaDescription },
      { label: 'Canonical tag', pass: !!home?.canonical },
      { label: 'CTA on homepage', pass: (home?.ctaCandidates.length ?? 0) > 0 },
      { label: 'Pricing page', pass: m.hasPricingPage },
      { label: 'Contact page', pass: m.hasContactPage },
    ];
    checks.forEach(({ label, pass }, i) => {
      const ry = y + i * 14;
      doc.circle(col1x + 4, ry + 4, 4).fillColor(pass ? C.green : C.red).fill();
      doc.fillColor(pass ? C.dark : C.light).fontSize(9).font('Helvetica')
        .text(label, col1x + 12, ry, { width: colW - 14 });
    });

    const stats: [string, string][] = [
      ['Pages crawled', String(m.pagesCount)],
      ['Total words', m.totalWords.toLocaleString()],
      ['Images', String(m.totalImages)],
      ['Scripts', String(m.totalScripts)],
      ['Internal links', String(m.uniqueInternalLinks)],
      ['Crawl time', `${(m.crawlDurationMs / 1000).toFixed(1)}s`],
    ];
    stats.forEach(([label, val], i) => {
      const ry = y + i * 14;
      doc.fillColor(C.medium).fontSize(9).font('Helvetica').text(label, col2x, ry);
      doc.fillColor(C.dark).fontSize(9).font('Helvetica-Bold').text(val, col2x, ry, { width: colW, align: 'right' });
    });

    // Tech stack under stats
    let techY = y + stats.length * 14 + 10;
    doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Tech Stack', col2x, techY);
    doc.moveTo(col2x, techY + 14).lineTo(col2x + colW, techY + 14).strokeColor(C.border).lineWidth(0.5).stroke();
    techY += 18;
    const techSections: [string, string[]][] = [
      ['CMS', m.techStack.cms],
      ['Frameworks', m.techStack.frameworks],
      ['Tracking', m.techStack.trackers.slice(0, 4)],
    ];
    techSections.forEach(([sLabel, items]) => {
      if (items.length === 0) return;
      doc.fillColor(C.medium).fontSize(8).font('Helvetica').text(sLabel, col2x, techY);
      techY += 11;
      let tx = col2x;
      items.forEach((t) => {
        const tw = doc.widthOfString(t) + 10;
        if (tx + tw > col2x + colW) { tx = col2x; techY += 14; }
        doc.rect(tx, techY - 1, tw, 13).strokeColor(C.border).lineWidth(0.5).stroke();
        doc.fillColor(C.dark).fontSize(8).font('Helvetica').text(t, tx + 5, techY + 1);
        tx += tw + 4;
      });
      techY += 16;
    });

    // ── Security headers section (on page 1 continuation) ──────────────────
    const sec = m.securityHeaders;
    if (sec) {
      const secY = Math.max(y + checks.length * 14 + 16, techY + 10);
      const drawSecY = secY < 680 ? secY : 680; // guard against overflow
      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Security Headers', col1x, drawSecY);
      doc.moveTo(col1x, drawSecY + 14).lineTo(col1x + colW, drawSecY + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      const secChecks: [string, boolean, string?][] = [
        ['HTTPS', sec.https],
        ['HSTS', sec.hsts],
        ['Content-Security-Policy', sec.csp],
        ['X-Frame-Options', !!sec.xFrameOptions, sec.xFrameOptions ?? undefined],
        ['X-Content-Type-Options', sec.xContentTypeOptions],
        ['Referrer-Policy', !!sec.referrerPolicy, sec.referrerPolicy ?? undefined],
      ];
      secChecks.forEach(([label, pass, val], i) => {
        const ry2 = drawSecY + 20 + i * 13;
        doc.circle(col1x + 4, ry2 + 4, 4).fillColor(pass ? C.green : C.red).fill();
        const displayLabel = val ? `${label}: ${val}` : label;
        doc.fillColor(pass ? C.dark : C.light).fontSize(8).font('Helvetica')
          .text(displayLabel, col1x + 12, ry2, { width: colW - 14, ellipsis: true });
      });
    }

    // Footer page 1
    const footerY = 800;
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.fillColor(C.light).fontSize(8).font('Helvetica')
      .text('SiteScope — sitescope.app', 40, footerY + 6);
    doc.fillColor(C.light).fontSize(8).font('Helvetica')
      .text(`${report.domain} · ${scanDate}`, 40, footerY + 6, { width: pageW, align: 'right' });

    // ── PAGE 2: SEO + Content Analysis ────────────────────────────────────────
    doc.addPage();

    doc.fillColor(C.blue).fontSize(8).font('Helvetica-Bold')
      .text('SITESCOPE · SEO & CONTENT ANALYSIS', 40, 40);
    doc.fillColor(C.medium).fontSize(9).font('Helvetica').text(report.domain, 40, 52);
    doc.moveTo(40, 64).lineTo(555, 64).strokeColor(C.border).lineWidth(0.5).stroke();

    let py2 = 74;

    // OG / Social Tags
    const og = home?.ogTags;
    const twitterCard = home?.twitterCard;
    {
      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Open Graph & Social Tags', 40, py2);
      doc.moveTo(40, py2 + 14).lineTo(555, py2 + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      py2 += 20;
      const ogChecks: [string, boolean, string?][] = [
        ['og:title', !!og?.title, og?.title ?? undefined],
        ['og:description', !!og?.description, og?.description?.slice(0, 60) ?? undefined],
        ['og:image', !!og?.image],
        ['og:type', !!og?.type, og?.type ?? undefined],
        ['twitter:card', !!twitterCard, twitterCard ?? undefined],
        ['Viewport meta tag', !!(home?.hasViewportMeta)],
      ];
      const ogColW = (pageW - 16) / 2;
      ogChecks.forEach(([label, pass, val], i) => {
        const col = i < 3 ? 40 : 40 + ogColW + 16;
        const row = i < 3 ? i : i - 3;
        const oy = py2 + row * 14;
        doc.circle(col + 4, oy + 4, 4).fillColor(pass ? C.green : C.red).fill();
        const display = val ? `${label}: ${val}` : label;
        doc.fillColor(pass ? C.dark : C.light).fontSize(8.5).font('Helvetica')
          .text(display, col + 12, oy, { width: ogColW - 14, ellipsis: true });
      });
      py2 += 3 * 14 + 10;
    }

    // Readability + Keywords (two columns)
    {
      const rColW = (pageW - 16) / 2;
      const rCol1 = 40;
      const rCol2 = 40 + rColW + 16;

      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Readability', rCol1, py2);
      doc.moveTo(rCol1, py2 + 14).lineTo(rCol1 + rColW, py2 + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Top Keywords', rCol2, py2);
      doc.moveTo(rCol2, py2 + 14).lineTo(rCol2 + rColW, py2 + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      py2 += 20;

      // Readability gauge
      const readScore = m.avgReadabilityScore;
      if (readScore !== undefined) {
        const readLabel = readScore >= 70 ? 'Easy to Read' : readScore >= 50 ? 'Moderate' : 'Complex';
        const readColor = readScore >= 70 ? C.green : readScore >= 50 ? C.amber : C.red;
        doc.fillColor(readColor).fontSize(28).font('Helvetica-Bold')
          .text(String(readScore), rCol1, py2, { width: rColW, align: 'center' });
        doc.fillColor(readColor).fontSize(9).font('Helvetica-Bold')
          .text(readLabel, rCol1, py2 + 32, { width: rColW, align: 'center' });
        // bar
        const barX = rCol1 + 10; const barW2 = rColW - 20;
        doc.rect(barX, py2 + 44, barW2, 5).fillColor(C.border).fill();
        doc.rect(barX, py2 + 44, barW2 * readScore / 100, 5).fillColor(readColor).fill();
        doc.fillColor(C.light).fontSize(7).font('Helvetica')
          .text('Flesch-Kincaid Reading Ease (0=hard, 100=easy)', rCol1, py2 + 52, { width: rColW, align: 'center' });

        // Image optimization
        if (m.imageOptimizationScore !== undefined) {
          const imgOptY = py2 + 68;
          doc.fillColor(C.medium).fontSize(8).font('Helvetica').text('Image optimization (WebP/AVIF)', rCol1, imgOptY);
          const barX2 = rCol1; const barW3 = rColW - 4;
          doc.rect(barX2, imgOptY + 11, barW3, 5).fillColor(C.border).fill();
          const imgColor = m.imageOptimizationScore >= 70 ? C.green : m.imageOptimizationScore >= 40 ? C.amber : C.red;
          doc.rect(barX2, imgOptY + 11, barW3 * m.imageOptimizationScore / 100, 5).fillColor(imgColor).fill();
          doc.fillColor(imgColor).fontSize(8).font('Helvetica-Bold')
            .text(`${m.imageOptimizationScore}%`, rCol1, imgOptY, { width: rColW, align: 'right' });
        }
      } else {
        doc.fillColor(C.light).fontSize(9).font('Helvetica').text('No readability data', rCol1, py2 + 10, { width: rColW, align: 'center' });
      }

      // Keywords cloud (top 12)
      const kws = (m.siteKeywords ?? []).slice(0, 12);
      if (kws.length > 0) {
        const maxCount = kws[0].count;
        let kx = rCol2; let ky = py2;
        kws.forEach(({ word, count }) => {
          const ratio = count / maxCount;
          const fs = Math.round(7 + ratio * 6); // 7-13px
          const tw2 = doc.widthOfString(word) * (fs / 12) + 8;
          if (kx + tw2 > rCol2 + rColW) { kx = rCol2; ky += fs + 6; }
          const kColor = ratio > 0.7 ? C.blue : ratio > 0.4 ? C.dark : C.medium;
          doc.fillColor(kColor).fontSize(fs).font('Helvetica-Bold').text(word, kx, ky);
          kx += tw2 + 2;
        });
        py2 = Math.max(py2 + 90, ky + 20);
      } else {
        py2 += 90;
      }
    }

    // Broken links
    const broken = m.brokenLinks ?? [];
    if (broken.length > 0) {
      py2 += 6;
      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text(`Broken Links (${broken.length})`, 40, py2);
      doc.moveTo(40, py2 + 14).lineTo(555, py2 + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      py2 += 20;
      // table header
      doc.fillColor(C.medium).fontSize(7.5).font('Helvetica-Bold')
        .text('URL', 40, py2)
        .text('Status', 400, py2)
        .text('Found On', 450, py2, { width: 105, ellipsis: true });
      py2 += 12;
      doc.moveTo(40, py2).lineTo(555, py2).strokeColor(C.border).lineWidth(0.3).stroke();
      py2 += 4;
      broken.slice(0, 8).forEach(({ url, foundOn, statusCode }) => {
        if (py2 > 760) return;
        const statusCol = statusCode === 404 ? C.red : statusCode === 0 ? C.amber : C.red;
        doc.fillColor(C.dark).fontSize(7.5).font('Helvetica')
          .text(url.replace(/^https?:\/\/[^/]+/, ''), 40, py2, { width: 350, ellipsis: true });
        doc.fillColor(statusCol).fontSize(7.5).font('Helvetica-Bold').text(String(statusCode || 'Timeout'), 400, py2);
        doc.fillColor(C.light).fontSize(7.5).font('Helvetica')
          .text(foundOn.replace(/^https?:\/\/[^/]+/, '') || '/', 450, py2, { width: 105, ellipsis: true });
        py2 += 13;
        doc.moveTo(40, py2 - 1).lineTo(555, py2 - 1).strokeColor(C.border).lineWidth(0.2).stroke();
      });
    }

    // Duplicate titles / metas
    const dupTitles = m.duplicateTitles ?? [];
    const dupMetas = m.duplicateMetas ?? [];
    if (dupTitles.length > 0 || dupMetas.length > 0) {
      py2 += 10;
      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('Duplicate SEO Tags', 40, py2);
      doc.moveTo(40, py2 + 14).lineTo(555, py2 + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      py2 += 20;
      if (dupTitles.length > 0) {
        doc.fillColor(C.amber).fontSize(8.5).font('Helvetica-Bold').text(`${dupTitles.length} duplicate title(s):`, 40, py2);
        py2 += 12;
        dupTitles.slice(0, 3).forEach((t) => {
          doc.fillColor(C.medium).fontSize(8).font('Helvetica').text(`• "${t}"`, 50, py2, { width: pageW - 10, ellipsis: true });
          py2 += 12;
        });
      }
      if (dupMetas.length > 0) {
        doc.fillColor(C.amber).fontSize(8.5).font('Helvetica-Bold').text(`${dupMetas.length} duplicate meta description(s):`, 40, py2);
        py2 += 12;
        dupMetas.slice(0, 2).forEach((t) => {
          doc.fillColor(C.medium).fontSize(8).font('Helvetica').text(`• "${t}"`, 50, py2, { width: pageW - 10, ellipsis: true });
          py2 += 12;
        });
      }
    }

    // Footer page 2
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.fillColor(C.light).fontSize(8).font('Helvetica').text('SiteScope — sitescope.app', 40, footerY + 6);
    doc.fillColor(C.light).fontSize(8).font('Helvetica')
      .text(`${report.domain} · Page 2`, 40, footerY + 6, { width: pageW, align: 'right' });

    // ── PAGE 3: Recommendations ────────────────────────────────────────────────
    doc.addPage();

    doc.fillColor(C.blue).fontSize(8).font('Helvetica-Bold')
      .text('SITESCOPE · RECOMMENDATIONS', 40, 40);
    doc.fillColor(C.medium).fontSize(9).font('Helvetica').text(report.domain, 40, 52);
    doc.moveTo(40, 64).lineTo(555, 64).strokeColor(C.border).lineWidth(0.5).stroke();

    let ry = 74;


    const drawRec = (rec: Recommendation, rank: number) => {
      const cardH = 64;
      if (ry + cardH > 780) { doc.addPage(); ry = 40; }
      doc.rect(40, ry, pageW, cardH).fillColor(C.bg).fill();
      doc.rect(40, ry, pageW, cardH).strokeColor(C.border).lineWidth(0.5).stroke();

      doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold')
        .text(`${rank}. ${rec.title}`, 50, ry + 8, { width: pageW - 20 });

      // badges
      let bx = 50;
      const badges: [string, string][] = [
        [rec.category, C.blue],
        [`${rec.impact} Impact`, impactColor(rec.impact)],
        [`${rec.effort} Effort`, effortColor(rec.effort)],
      ];
      const badgeY = ry + 22;
      badges.forEach(([text, color]) => {
        const bw = doc.widthOfString(text) + 10;
        const [r, g, b] = hexToRgb(color);
        doc.rect(bx, badgeY, bw, 12).fillColor([r, g, b, 0.15] as unknown as string).fill();
        doc.fillColor(color).fontSize(7).font('Helvetica-Bold').text(text, bx + 5, badgeY + 2);
        bx += bw + 4;
      });

      doc.fillColor(C.medium).fontSize(8).font('Helvetica')
        .text(rec.description, 50, ry + 38, { width: pageW - 20, height: 22, ellipsis: true });

      ry += cardH + 6;
    };

    // Rule-based recs
    doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold')
      .text(`Top ${recommendations.length} Prioritized Recommendations`, 40, ry);
    doc.moveTo(40, ry + 14).lineTo(555, ry + 14).strokeColor(C.border).lineWidth(0.5).stroke();
    ry += 20;
    recommendations.forEach((rec, i) => drawRec(rec, i + 1));

    // AI recs
    if (aiInsights && aiInsights.aiRecommendations.length > 0) {
      ry += 4;
      doc.fillColor(C.black).fontSize(11).font('Helvetica-Bold').text('AI-Generated Insights', 40, ry);
      doc.moveTo(40, ry + 14).lineTo(555, ry + 14).strokeColor(C.border).lineWidth(0.5).stroke();
      ry += 20;
      aiInsights.aiRecommendations.forEach((rec, i) => drawRec(rec, recommendations.length + i + 1));
    }

    // Footer page 3
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.fillColor(C.light).fontSize(8).font('Helvetica')
      .text('SiteScope — sitescope.app', 40, footerY + 6);
    doc.fillColor(C.light).fontSize(8).font('Helvetica')
      .text('Results are best-effort based on public page crawl', 40, footerY + 6, { width: pageW, align: 'right' });

    doc.end();
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let report: Report;

  if (id === 'demo') {
    report = MOCK_REPORT;
  } else {
    try {
      const sb = getServerSupabase();
      const { data, error } = await sb
        .from('reports')
        .select('report_json')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      report = data.report_json as unknown as Report;
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  try {
    const buffer = await generatePDF(report);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sitescope-${report.domain}-${id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PDF] Generation error:', msg);
    return NextResponse.json({ error: 'PDF generation failed', details: msg }, { status: 500 });
  }
}

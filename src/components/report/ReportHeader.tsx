'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, Link2, RefreshCw, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { Report } from '@/lib/types';

interface Props {
  report: Report;
}

export function ReportHeader({ report }: Props) {
  function copyShareLink() {
    const url = `${window.location.origin}/report/${report.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Report link copied!'));
  }

  const [pdfLoading, setPdfLoading] = useState(false);

  async function downloadPdf() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/pdf/${report.id}`);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sitescope-${report.domain}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  const domain = report.domain;
  const isDemo = report.id === 'demo';

  return (
    <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Back */}
          <a href="/" className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>

          {/* Favicon + site info */}
          <div className="flex items-center gap-3">
            {report.favicon ? (
              <Image
                src={report.favicon}
                alt={domain}
                width={28}
                height={28}
                className="rounded-md border border-slate-100"
                unoptimized
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                {domain.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">{domain}</span>
                <a
                  href={report.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-700"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-slate-400">{formatDate(report.createdAt)}</span>
                {report.aiEnabled && (
                  <Badge className="text-[10px] h-4 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">AI Enhanced</Badge>
                )}
                {report.siteMetrics?.siteType && report.siteMetrics.siteType !== 'unknown' && (
                  <Badge className="text-[10px] h-4 bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 capitalize">{report.siteMetrics.siteType}</Badge>
                )}
                {report.expiresAt && (
                  <span className="text-[10px] text-slate-400">
                    {new Date(report.expiresAt) < new Date() ? 'Expired' : `Expires ${new Date(report.expiresAt).toLocaleDateString()}`}
                  </span>
                )}
                {!report.expiresAt && !isDemo && (
                  <span className="text-[10px] text-slate-400">Never expires</span>
                )}
                {isDemo && (
                  <Badge className="text-[10px] h-4 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Demo Report</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            {!isDemo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newUrl = report.url;
                  window.location.href = `/?url=${encodeURIComponent(newUrl)}`;
                }}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw className="w-3 h-3" />
                Rescan
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={copyShareLink}
              className="gap-1.5 text-xs h-8"
            >
              <Link2 className="w-3 h-3" />
              Copy Link
            </Button>
            <Button
              size="sm"
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700"
            >
              {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

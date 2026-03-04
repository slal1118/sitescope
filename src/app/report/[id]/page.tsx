'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportHeader } from '@/components/report/ReportHeader';
import { ScoreCards } from '@/components/report/ScoreCard';
import { OverviewTab } from '@/components/report/OverviewTab';
import { SEOTab } from '@/components/report/SEOTab';
import { CROTab } from '@/components/report/CROTab';
import { TechTab } from '@/components/report/TechTab';
import { ContentTab } from '@/components/report/ContentTab';
import { RecommendationsTab } from '@/components/report/RecommendationsTab';
import { LoadingState } from '@/components/report/LoadingState';
import type { Report } from '@/lib/types';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/report/${id}`)
      .then((res) => { if (!res.ok) throw new Error('Report not found'); return res.json(); })
      .then(({ report }) => setReport(report))
      .catch((err) => setError(err.message ?? 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Report not found</h2>
          <p className="text-sm text-slate-500 mb-6">{error ?? 'This report may have expired or the ID is incorrect.'}</p>
          <button onClick={() => router.push('/')} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-4 h-4" />
            Back to scanner
          </button>
        </div>
      </div>
    );
  }

  const recCount = report.recommendations.length + (report.aiInsights?.aiRecommendations.length ?? 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <ReportHeader report={report} />

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <ScoreCards scores={report.scores} />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 bg-white border border-slate-200 p-1 rounded-lg">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="cro" className="text-xs">CRO</TabsTrigger>
            <TabsTrigger value="seo" className="text-xs">SEO</TabsTrigger>
            <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
            <TabsTrigger value="tech" className="text-xs">Tech Stack</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">
              Recommendations
              <span className="ml-1.5 bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 rounded-full">
                {recCount}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab report={report} /></TabsContent>
          <TabsContent value="cro"><CROTab report={report} /></TabsContent>
          <TabsContent value="seo"><SEOTab report={report} /></TabsContent>
          <TabsContent value="content"><ContentTab report={report} /></TabsContent>
          <TabsContent value="tech"><TechTab report={report} /></TabsContent>
          <TabsContent value="recommendations"><RecommendationsTab report={report} /></TabsContent>
        </Tabs>

        <div className="text-center py-4">
          <p className="text-xs text-slate-400">
            SiteScope scans public pages only. Results are best-effort.{' '}
            <a href="/" className="text-blue-500 hover:underline">Scan another site →</a>
          </p>
        </div>
      </div>
    </div>
  );
}

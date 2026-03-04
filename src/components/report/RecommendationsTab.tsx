import { Lightbulb, Sparkles, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { impactColor, effortColor, categoryColor, cn } from '@/lib/utils';
import type { Report, Recommendation } from '@/lib/types';

function RecCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  return (
    <div className="py-4 border-b border-slate-50 last:border-0">
      <div className="flex items-start gap-4">
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-0.5">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-1.5">
            <h4 className="text-sm font-semibold text-slate-900 flex-1">{rec.title}</h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', categoryColor(rec.category))}>
              {rec.category}
            </span>
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', impactColor(rec.impact))}>
              {rec.impact} Impact
            </span>
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', effortColor(rec.effort))}>
              {rec.effort} Effort
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{rec.description}</p>
        </div>
      </div>
    </div>
  );
}

function QuickWinBadge({ recs }: { recs: Recommendation[] }) {
  const quickWins = recs.filter((r) => r.impact === 'High' && r.effort === 'Low');
  if (quickWins.length === 0) return null;

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
          <ArrowUpRight className="w-4 h-4" />
          Quick Wins ({quickWins.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-emerald-600 mb-3">High impact, low effort — start here.</p>
        <div className="space-y-2">
          {quickWins.map((rec) => (
            <div key={rec.id} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">{rec.title}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecommendationsTab({ report }: { report: Report }) {
  const { recommendations, aiInsights } = report;

  // Merge AI recs (if any) at the end with lower priority
  const allRecs = [...recommendations];
  if (aiInsights?.aiRecommendations?.length) {
    const existingIds = new Set(recommendations.map((r) => r.id));
    const aiOnly = aiInsights.aiRecommendations.filter((r) => !existingIds.has(r.id));
    allRecs.push(...aiOnly);
  }

  const byCategory = allRecs.reduce(
    (acc, rec) => {
      if (!acc[rec.category]) acc[rec.category] = [];
      acc[rec.category].push(rec);
      return acc;
    },
    {} as Record<string, Recommendation[]>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {allRecs.filter((r) => r.impact === 'High').length}
          </p>
          <p className="text-xs text-red-500 font-medium mt-1">High Impact</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">
            {allRecs.filter((r) => r.impact === 'Medium').length}
          </p>
          <p className="text-xs text-amber-500 font-medium mt-1">Medium Impact</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {allRecs.filter((r) => r.effort === 'Low').length}
          </p>
          <p className="text-xs text-emerald-500 font-medium mt-1">Quick Wins</p>
        </div>
      </div>

      <QuickWinBadge recs={allRecs} />

      {/* All recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            All Recommendations ({allRecs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allRecs.map((rec, i) => (
            <RecCard key={rec.id} rec={rec} rank={i + 1} />
          ))}
        </CardContent>
      </Card>

      {/* By category */}
      {Object.entries(byCategory).length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(byCategory).map(([cat, recs]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-full', categoryColor(cat))}>
                    {cat}
                  </span>
                  <span className="text-xs text-slate-400">{recs.length}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {aiInsights && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
          <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <p className="text-xs text-purple-700">
            AI-enhanced recommendations are included above. They may overlap with or expand on the rule-based findings.
          </p>
        </div>
      )}

      <div className="text-xs text-slate-400 text-center pb-2">
        Results are best-effort based on a limited crawl of public pages.
      </div>
    </div>
  );
}

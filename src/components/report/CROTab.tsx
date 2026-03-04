import { MousePointerClick, ShieldCheck, FormInput, DollarSign, PhoneCall, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { scoreColor, scoreBg, cn, hasTrustSignals } from '@/lib/utils';
import type { Report } from '@/lib/types';

interface CROFactorProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  detail: string;
  color: string;
}

function CROFactor({ icon, label, score, detail, color }: CROFactorProps) {
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-800">{label}</p>
            <span className="text-xs font-semibold text-slate-600">{score}%</span>
          </div>
          <Progress value={score} className="h-1" />
        </div>
      </div>
      <p className="text-xs text-slate-500 ml-10">{detail}</p>
    </div>
  );
}

export function CROTab({ report }: { report: Report }) {
  const { siteMetrics: m, scores, aiInsights } = report;
  const home = m.crawledPages[0];

  if (!home) return null;

  const allPages = m.crawledPages;
  const trustSignalsPresent = hasTrustSignals(allPages);
  const allCtaCount = allPages.reduce((s, p) => s + p.ctaCandidates.length, 0);
  const hasForms = allPages.some((p) => p.formsCount > 0);
  const maxInputs = Math.max(...allPages.map((p) => p.inputTypes.length), 0);

  const ctaScore = Math.min(
    100,
    (home.ctaCandidates.length >= 2 ? 80 : home.ctaCandidates.length === 1 ? 50 : 0) +
      (allCtaCount > 5 ? 20 : 0)
  );

  const trustScore = trustSignalsPresent ? 80 : 20;
  const frictionScore = hasForms
    ? maxInputs <= 3
      ? 90
      : maxInputs <= 5
      ? 70
      : maxInputs <= 8
      ? 45
      : 20
    : 50;
  const clarityScore = m.hasPricingPage ? 85 : 35;
  const contactScore = m.hasContactPage ? 90 : 30;

  const allCtaCandidates = Array.from(new Set(allPages.flatMap((p) => p.ctaCandidates)));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Score */}
      <div className={cn('rounded-xl border p-5', scoreBg(scores.cro))}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">CRO Score</p>
            <p className={cn('text-4xl font-bold', scoreColor(scores.cro))}>{scores.cro}</p>
          </div>
          <TrendingUp className={cn('w-10 h-10 opacity-20', scoreColor(scores.cro))} />
        </div>
      </div>

      {/* AI Messaging insight */}
      {aiInsights?.messagingAnalysis && (
        <Card className="border-purple-100 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Messaging Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 leading-relaxed">{aiInsights.messagingAnalysis}</p>
          </CardContent>
        </Card>
      )}

      {/* CRO Factors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Conversion Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <CROFactor
            icon={<MousePointerClick className="w-3.5 h-3.5 text-blue-600" />}
            label="Call-to-Action Presence"
            score={ctaScore}
            detail={
              home.ctaCandidates.length > 0
                ? `${home.ctaCandidates.length} CTA${home.ctaCandidates.length !== 1 ? 's' : ''} on homepage, ${allCtaCount} across site.`
                : 'No CTAs detected on the homepage — critical conversion gap.'
            }
            color="bg-blue-50"
          />
          <CROFactor
            icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
            label="Trust Signals"
            score={trustScore}
            detail={
              trustSignalsPresent
                ? 'Trust indicators detected (testimonials, security badges, or certifications).'
                : 'No trust signals detected. Add social proof, security badges, or testimonials.'
            }
            color="bg-emerald-50"
          />
          <CROFactor
            icon={<FormInput className="w-3.5 h-3.5 text-amber-600" />}
            label="Form Friction"
            score={frictionScore}
            detail={
              !hasForms
                ? 'No forms found. Consider adding lead capture forms.'
                : maxInputs <= 3
                ? `Lean forms (max ${maxInputs} fields) — good for completion rates.`
                : `Forms with ${maxInputs} fields detected. Consider reducing fields for higher completion.`
            }
            color="bg-amber-50"
          />
          <CROFactor
            icon={<DollarSign className="w-3.5 h-3.5 text-purple-600" />}
            label="Pricing Clarity"
            score={clarityScore}
            detail={
              m.hasPricingPage
                ? 'Pricing page found — helps visitors self-qualify.'
                : 'No pricing page detected. Even a "contact for pricing" page beats nothing.'
            }
            color="bg-purple-50"
          />
          <CROFactor
            icon={<PhoneCall className="w-3.5 h-3.5 text-rose-600" />}
            label="Contact Accessibility"
            score={contactScore}
            detail={
              m.hasContactPage
                ? 'Contact page found — lowers barrier for high-intent visitors.'
                : 'No contact page found. High-intent visitors need an easy way to reach you.'
            }
            color="bg-rose-50"
          />
        </CardContent>
      </Card>

      {/* CTAs found */}
      {allCtaCandidates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-slate-400" />
              All CTAs Detected ({allCtaCandidates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allCtaCandidates.map((cta, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">
                  {cta}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form analysis */}
      {hasForms && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FormInput className="w-4 h-4 text-slate-400" />
              Form Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allPages
              .filter((p) => p.formsCount > 0)
              .map((page) => (
                <div key={page.url} className="py-2 border-b border-slate-50 last:border-0">
                  <p className="text-xs font-mono text-slate-500 mb-1 truncate">
                    {page.url.replace(/https?:\/\/[^/]+/, '')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {page.formsCount} form{page.formsCount !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {page.inputTypes.length} fields
                    </Badge>
                    {page.inputTypes.length > 5 && (
                      <Badge variant="warning" className="text-xs">
                        High friction
                      </Badge>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {Array.from(new Set(page.inputTypes)).map((t, i) => (
                        <span key={i} className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

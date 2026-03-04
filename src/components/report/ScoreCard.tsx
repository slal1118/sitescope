import { cn, scoreColor, scoreBg, scoreLabel } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { Scores } from '@/lib/types';

function ScoreChip({ label, score, description }: { label: string; score: number; description?: string }) {
  return (
    <div className={cn('rounded-xl border p-4 transition-all', scoreBg(score))}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
          {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
        <span className={cn('text-2xl font-bold tabular-nums', scoreColor(score))}>{score}</span>
      </div>
      <Progress value={score} className="h-1.5" />
      <p className={cn('text-xs font-medium mt-1.5', scoreColor(score))}>{scoreLabel(score)}</p>
    </div>
  );
}

export function ScoreCards({ scores }: { scores: Scores }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      <ScoreChip label="Overall" score={scores.overall} description="Combined" />
      <ScoreChip label="Messaging" score={scores.messaging} description="Clarity & positioning" />
      <ScoreChip label="SEO" score={scores.seo} description="Search visibility" />
      <ScoreChip label="CRO" score={scores.cro} description="Conversion" />
      <ScoreChip label="Accessibility" score={scores.accessibility} description="A11y compliance" />
    </div>
  );
}

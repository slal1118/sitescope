import {
  Code2,
  BarChart3,
  Layers,
  Globe,
  MessageSquare,
  Package,
  Zap,
  Image,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Report } from '@/lib/types';

const TRACKER_ICONS: Record<string, string> = {
  'Google Analytics': '📊',
  'Google Tag Manager': '🏷️',
  'Meta Pixel': '📘',
  'TikTok Pixel': '🎵',
  Hotjar: '🔥',
  Intercom: '💬',
  Drift: '💬',
  Mixpanel: '📈',
  Segment: '⚡',
  Heap: '📦',
  'Microsoft Clarity': '🔍',
  Crisp: '💬',
  'HubSpot Analytics': '🧡',
};

const CMS_ICONS: Record<string, string> = {
  WordPress: '📝',
  Shopify: '🛒',
  Webflow: '🌊',
  Squarespace: '⬛',
  Wix: '✨',
  HubSpot: '🧡',
  Drupal: '💧',
  Ghost: '👻',
  Framer: '🎨',
};

const FRAMEWORK_ICONS: Record<string, string> = {
  'Next.js': '▲',
  React: '⚛️',
  Vue: '💚',
  Angular: '🔴',
  Nuxt: '💚',
  Gatsby: '💜',
  Svelte: '🔥',
};

interface TechGroupProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
  icons: Record<string, string>;
  emptyText: string;
  color: string;
}

function TechGroup({ icon, title, items, icons, emptyText, color }: TechGroupProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>{icon}</span>
          {title}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {items.length} found
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 italic">{emptyText}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-colors"
              >
                {icons[item] && <span className="text-base leading-none">{icons[item]}</span>}
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TechTab({ report }: { report: Report }) {
  const { siteMetrics: m } = report;
  const { techStack } = m;

  const uniqueScripts = [
    ...new Set(m.crawledPages.flatMap((p) => p.scriptSrcs).filter(Boolean)),
  ].slice(0, 20);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: <Package className="w-4 h-4 text-slate-500" />,
            label: 'CMS',
            value: techStack.cms.length || '—',
            sub: techStack.cms.join(', ') || 'Not detected',
          },
          {
            icon: <Code2 className="w-4 h-4 text-slate-500" />,
            label: 'Framework',
            value: techStack.frameworks.length || '—',
            sub: techStack.frameworks.join(', ') || 'Not detected',
          },
          {
            icon: <BarChart3 className="w-4 h-4 text-slate-500" />,
            label: 'Trackers',
            value: techStack.trackers.length || '0',
            sub: `${techStack.trackers.length} tool${techStack.trackers.length !== 1 ? 's' : ''}`,
          },
          {
            icon: <Zap className="w-4 h-4 text-slate-500" />,
            label: 'Total Scripts',
            value: m.totalScripts,
            sub: 'across all pages',
          },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              {item.icon}
              <p className="text-xs text-slate-500 font-medium">{item.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-0.5">{item.value}</p>
            <p className="text-xs text-slate-400 truncate">{item.sub}</p>
          </div>
        ))}
      </div>

      <TechGroup
        icon={<Package className="w-3.5 h-3.5 text-blue-600" />}
        title="CMS / Website Builder"
        items={techStack.cms}
        icons={CMS_ICONS}
        emptyText="No CMS detected — site may be custom-built."
        color="bg-blue-50"
      />

      <TechGroup
        icon={<Layers className="w-3.5 h-3.5 text-purple-600" />}
        title="Frontend Framework"
        items={techStack.frameworks}
        icons={FRAMEWORK_ICONS}
        emptyText="No frontend framework detected."
        color="bg-purple-50"
      />

      <TechGroup
        icon={<BarChart3 className="w-3.5 h-3.5 text-emerald-600" />}
        title="Analytics & Tracking"
        items={techStack.trackers}
        icons={TRACKER_ICONS}
        emptyText="No analytics tools detected — consider adding Google Analytics or similar."
        color="bg-emerald-50"
      />

      {techStack.cdns.length > 0 && (
        <TechGroup
          icon={<Globe className="w-3.5 h-3.5 text-sky-600" />}
          title="CDN / Hosting"
          items={techStack.cdns}
          icons={{}}
          emptyText=""
          color="bg-sky-50"
        />
      )}

      {techStack.chatWidgets.length > 0 && (
        <TechGroup
          icon={<MessageSquare className="w-3.5 h-3.5 text-amber-600" />}
          title="Chat Widgets"
          items={techStack.chatWidgets}
          icons={{}}
          emptyText=""
          color="bg-amber-50"
        />
      )}

      {/* Performance signals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-400" />
            Performance Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Code2 className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs text-slate-500">Scripts / page</p>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {m.pagesCount > 0 ? Math.round(m.totalScripts / m.pagesCount) : 0}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {m.totalScripts / m.pagesCount > 8 ? '⚠ High script load' : '✓ Acceptable'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Image className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs text-slate-500">Images / page</p>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {m.pagesCount > 0 ? Math.round(m.totalImages / m.pagesCount) : 0}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {m.totalImages / m.pagesCount > 20 ? '⚠ Optimize images' : '✓ Acceptable'}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            * Performance data is based on DOM inspection only. Run Google PageSpeed Insights for full
            Lighthouse scores.
          </p>
        </CardContent>
      </Card>

      {/* Script list */}
      {uniqueScripts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-400" />
              Third-Party Scripts ({uniqueScripts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {uniqueScripts.map((src, i) => (
                <p key={i} className="text-xs font-mono text-slate-500 truncate py-0.5">
                  {src.length > 80 ? src.slice(0, 80) + '…' : src}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

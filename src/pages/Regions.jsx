// @ts-nocheck
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Loader2, ChevronRight, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

const oceanGradients = {
  Pacific: 'from-sky-500/20 via-sky-400/10 to-transparent',
  Atlantic: 'from-indigo-500/20 via-indigo-400/10 to-transparent',
  Indian: 'from-teal-500/20 via-teal-400/10 to-transparent',
  Arctic: 'from-cyan-400/20 via-cyan-300/10 to-transparent',
  Southern: 'from-violet-500/20 via-violet-400/10 to-transparent',
};

const riskDot = {
  critical: 'bg-rose-400 shadow-[0_0_14px_#f43f5e]',
  high: 'bg-amber-400 shadow-[0_0_12px_#f59e0b]',
  moderate: 'bg-sky-400 shadow-[0_0_10px_#38bdf8]',
  low: 'bg-emerald-400 shadow-[0_0_10px_#34d399]',
};

export default function Regions() {
  const { data: regions = [], isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: () => base44.entities.OceanRegion.list('-risk_score'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const critical = regions.filter((r) => r.risk_level === 'critical');
  const rest = regions.filter((r) => r.risk_level !== 'critical');

  return (
    <div className="p-6 lg:p-8 space-y-8 h-full overflow-y-auto">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80 font-semibold">Enforcement Priorities</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Regions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan left to right. Critical conditions surface first.
        </p>
      </header>

      <Rail title="Critical conditions" count={critical.length} accent>
        {critical.length === 0 && <EmptyRail label="No critical regions right now" />}
        {critical.map((r) => (
          <RegionCard key={r.id} region={r} />
        ))}
      </Rail>

      <Rail title="All monitored regions" count={rest.length}>
        {rest.map((r) => (
          <RegionCard key={r.id} region={r} />
        ))}
      </Rail>
    </div>
  );
}

function Rail({ title, count, accent, children }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        {accent && <AlertOctagon className="w-4 h-4 text-rose-400" />}
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/70">{title}</h2>
        <span className="text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-6 px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory scroll-smooth">
        {children}
      </div>
    </section>
  );
}

function EmptyRail({ label }) {
  return (
    <div className="flex-shrink-0 w-56 h-28 rounded-xl border border-dashed border-border/60 flex items-center justify-center">
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function RegionCard({ region }) {
  const gradient = oceanGradients[region.ocean] || oceanGradients.Pacific;
  const dot = riskDot[region.risk_level] || riskDot.moderate;
  const isCritical = region.risk_level === 'critical';

  return (
    <Link
      to={`/regions/${region.id}`}
      className={cn(
        'snap-start flex-shrink-0 w-60 h-28 rounded-xl border p-4 relative overflow-hidden group transition-all',
        'bg-card/60 border-border/60 hover:border-primary/40 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]',
        isCritical && 'border-rose-500/40',
      )}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-70 pointer-events-none', gradient)} />
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{region.ocean}</span>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
            {isCritical && (
              <span className="text-[9px] font-semibold text-rose-300 uppercase tracking-wider">Critical</span>
            )}
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">{region.name}</h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}

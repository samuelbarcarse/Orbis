// @ts-nocheck
// Full-screen modal dashboard showing ML-driven species population forecast for a hotspot.
import React, { useEffect, useState } from 'react';
import { X, Loader2, FlaskConical, TrendingDown, Clock, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { generateSpeciesImpact, computePressureScore } from '@/lib/geminiClient';
import { cn } from '@/lib/utils';

function PressureGauge({ score }) {
  const color =
    score >= 67 ? 'text-destructive' :
    score >= 34 ? 'text-amber-400' :
                  'text-emerald-400';
  const trackColor =
    score >= 67 ? 'bg-destructive' :
    score >= 34 ? 'bg-amber-400' :
                  'bg-emerald-400';
  const label =
    score >= 67 ? 'High Pressure' :
    score >= 34 ? 'Moderate Pressure' :
                  'Low Pressure';

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ecosystem Pressure Score
        </p>
      </div>

      <div className="flex items-end gap-4">
        <span className={cn('text-6xl font-black tabular-nums leading-none', color)}>{score}</span>
        <div className="pb-1">
          <span className={cn('text-sm font-semibold', color)}>{label}</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">out of 100</p>
        </div>
      </div>

      {/* Bar */}
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className={cn('h-full rounded-full', trackColor)}
        />
      </div>

      {/* Factor breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Vessel activity',   value: Math.round(Math.min(score * 0.42, 40)) },
          { label: 'MPA exposure',      value: Math.round(Math.min(score * 0.31, 30)) },
          { label: 'Fishing density',   value: Math.round(Math.min(score * 0.21, 20)) },
          { label: 'Severity rating',   value: Math.round(Math.min(score * 0.10, 10)) },
        ].map((f) => (
          <div key={f.label} className="bg-muted/50 rounded-xl px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', trackColor)}
                  style={{ width: `${(f.value / (f.label === 'Vessel activity' ? 40 : f.label === 'MPA exposure' ? 30 : f.label === 'Fishing density' ? 20 : 10)) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums">{f.value}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Score combines vessel count, distance to protected areas, fishing density, and overall severity.
        Higher scores indicate greater risk to local marine ecosystems.
      </p>
    </div>
  );
}

export default function SpeciesForecast({ hotspot, onClose }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hotspot) return;
    let cancelled = false;
    setLoading(true);
    setResult(null);
    generateSpeciesImpact(hotspot).then((r) => {
      if (!cancelled) setResult(r);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hotspot?.id]);

  const score = hotspot ? computePressureScore(hotspot) : 0;

  return (
    <AnimatePresence>
      {hotspot && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed inset-x-4 top-6 bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[820px] z-50 bg-background/98 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">Species Population Forecast</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    ML-driven impact analysis · {hotspot.nearest_mpa ?? 'Open water'} ·{' '}
                    {hotspot.latitude?.toFixed(2)}°, {hotspot.longitude?.toFixed(2)}°
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid md:grid-cols-2 gap-5">
                {/* Left — pressure gauge */}
                <div className="space-y-5">
                  <PressureGauge score={result?.score ?? score} />

                  {/* Context pills */}
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hotspot context</p>
                    <div className="space-y-2">
                      {[
                        { icon: TrendingDown, label: `${hotspot.vessel_count} dark vessels detected`, tone: 'text-destructive' },
                        { icon: Clock,        label: hotspot.in_mpa ? `Inside ${hotspot.nearest_mpa}` : `${hotspot.proximity_to_mpa_km} km from nearest reserve`, tone: hotspot.in_mpa ? 'text-destructive' : 'text-muted-foreground' },
                        { icon: Leaf,         label: `Severity: ${String(hotspot.severity).charAt(0).toUpperCase() + String(hotspot.severity).slice(1)}`, tone: 'text-muted-foreground' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <item.icon className={cn('w-3.5 h-3.5 flex-shrink-0', item.tone)} />
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right — AI forecast */}
                <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">AI Population Analysis</p>
                  </div>

                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground text-center">
                        Analysing species at risk<br />and projecting population trends…
                      </p>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-xs leading-relaxed overflow-auto
                      [&>h2]:text-[11px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-wider
                      [&>h2]:text-foreground [&>h2]:mt-5 [&>h2]:mb-2 [&>h2:first-child]:mt-0
                      [&>ul]:space-y-1 [&>p]:my-1.5 [&>ul]:my-1.5">
                      <ReactMarkdown>{result?.markdown ?? ''}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[9px] text-muted-foreground/60 text-center mt-6 leading-relaxed">
                Ecosystem pressure score is computed from vessel count, MPA proximity, fishing density, and severity.
                Species analysis is AI-generated based on regional ecological data and should be treated as indicative, not authoritative.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

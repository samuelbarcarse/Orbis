// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  X, Loader2, Sparkles, MessageCircle, ShieldAlert, Ship, MapPin,
  AlertCircle, ExternalLink, HandHelping, Leaf, FlaskConical, TrendingDown, Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { generateThreatAnalysis, getCachedThreatAnalysis, generateSpeciesImpact, getCachedSpeciesImpact, computePressureScore } from '@/lib/geminiClient';

const SEVERITY = {
  high:   { label: 'High Risk',     bg: 'bg-destructive/15 text-destructive border-destructive/30' },
  medium: { label: 'Elevated Risk', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  low:    { label: 'Low Risk',      bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
};

// ─── Pressure Gauge ───────────────────────────────────────────────────────────

function PressureGauge({ score }) {
  const color = score >= 67 ? 'text-destructive' : score >= 34 ? 'text-amber-400' : 'text-emerald-400';
  const trackColor = score >= 67 ? 'bg-destructive' : score >= 34 ? 'bg-amber-400' : 'bg-emerald-400';
  const label = score >= 67 ? 'High Pressure' : score >= 34 ? 'Moderate Pressure' : 'Low Pressure';

  return (
    <div className="bg-muted/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ecosystem Pressure</p>
      </div>
      <div className="flex items-end gap-3">
        <span className={cn('text-4xl font-black tabular-nums leading-none', color)}>{score}</span>
        <div className="pb-0.5">
          <span className={cn('text-xs font-semibold', color)}>{label}</span>
          <p className="text-[9px] text-muted-foreground">/ 100</p>
        </div>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', trackColor)}
        />
      </div>
    </div>
  );
}

// ─── Tab content components ───────────────────────────────────────────────────

function ThreatTab({ hotspot, sev }) {
  const { getToken } = useAuth();
  const cached = getCachedThreatAnalysis(hotspot?.id);
  const [analysis, setAnalysis] = useState(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!hotspot) return;
    const already = getCachedThreatAnalysis(hotspot.id);
    if (already) { setAnalysis(already); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setAnalysis(null);
    getToken()
      .then((token) => generateThreatAnalysis(hotspot, token))
      .then((a) => { if (!cancelled) setAnalysis(a); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hotspot?.id]);

  const skeletonRows = (n) => Array.from({ length: n }, (_, i) => (
    <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-1.5 animate-pulse">
      <div className="h-2.5 w-2/5 bg-muted-foreground/20 rounded" />
      <div className="h-2 w-full bg-muted-foreground/10 rounded" />
      <div className="h-2 w-4/5 bg-muted-foreground/10 rounded" />
    </div>
  ));

  return (
    <div className="flex-1 overflow-auto">
      {/* Key facts */}
      <div className="p-5 space-y-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Ship className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{hotspot.vessel_count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">vessels detected in area</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', hotspot.in_mpa ? 'bg-destructive/10' : 'bg-muted')}>
            <ShieldAlert className={cn('w-5 h-5', hotspot.in_mpa ? 'text-destructive' : 'text-muted-foreground')} />
          </div>
          <div>
            {hotspot.in_mpa ? (
              <>
                <p className="text-sm font-semibold text-destructive leading-none">Inside Protected Area</p>
                <p className="text-xs text-muted-foreground mt-0.5">{hotspot.nearest_mpa}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold leading-none">{hotspot.proximity_to_mpa_km} km from nearest reserve</p>
                <p className="text-xs text-muted-foreground mt-0.5">{hotspot.nearest_mpa ?? 'No MPA nearby'}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">
              {hotspot.latitude?.toFixed(2)}°, {hotspot.longitude?.toFixed(2)}°
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{hotspot.proximity_to_coast_km} km from shore</p>
          </div>
        </div>
      </div>

      {/* Why this matters */}
      <div className="p-5 space-y-3 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive">Why this matters</p>
        </div>
        <div className="space-y-2">
          {loading
            ? skeletonRows(3)
            : (analysis?.reasons ?? []).map((r, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold">{r.headline}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.detail}</p>
                </div>
              ))}
        </div>
      </div>

      {/* Environmental Impact */}
      <div className="p-5 space-y-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Environmental Impact</p>
        </div>
        {loading ? (
          <div className="space-y-1.5 animate-pulse">
            {[1, 0.9, 1, 0.7, 1, 0.85].map((w, i) => (
              <div key={i} className={`h-2 bg-muted-foreground/10 rounded`} style={{ width: `${w * 100}%` }} />
            ))}
          </div>
        ) : (
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-xs leading-relaxed [&>h2]:text-[11px] [&>h2]:font-semibold [&>h2]:uppercase [&>h2]:tracking-wider [&>h2]:text-foreground [&>h2]:mt-3 [&>h2]:mb-1 [&>p]:my-1">
            <ReactMarkdown>{analysis?.impact ?? ''}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* What you can do */}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HandHelping className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">What you can do</p>
        </div>
        <div className="space-y-2">
          {loading
            ? skeletonRows(3)
            : (analysis?.actions ?? []).map((a, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{a.detail}</p>
                  {a.search && (
                    <button
                      onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(a.search)}`, '_blank')}
                      className="mt-1 flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {a.org}
                    </button>
                  )}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

function SpeciesTab({ hotspot }) {
  const cachedSpecies = getCachedSpeciesImpact(hotspot?.id);
  const [result, setResult] = useState(cachedSpecies);
  const [loading, setLoading] = useState(!cachedSpecies);
  const score = hotspot ? computePressureScore(hotspot) : 0;

  useEffect(() => {
    if (!hotspot) return;
    const already = getCachedSpeciesImpact(hotspot.id);
    if (already) { setResult(already); setLoading(false); return; }
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

  return (
    <div className="flex-1 overflow-auto p-5 space-y-4">
      <PressureGauge score={result?.score ?? score} />

      {/* Context pills */}
      <div className="bg-muted/40 rounded-xl p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hotspot context</p>
        {[
          { icon: TrendingDown, label: `${hotspot.vessel_count} vessels in area`, tone: 'text-destructive' },
          {
            icon: Clock,
            label: hotspot.in_mpa
              ? `Inside ${hotspot.nearest_mpa}`
              : `${hotspot.proximity_to_mpa_km} km from nearest reserve`,
            tone: hotspot.in_mpa ? 'text-destructive' : 'text-muted-foreground',
          },
          { icon: Leaf, label: `Severity: ${String(hotspot.severity || '').charAt(0).toUpperCase() + String(hotspot.severity || '').slice(1)}`, tone: 'text-muted-foreground' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <item.icon className={cn('w-3.5 h-3.5 flex-shrink-0', item.tone)} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* AI Forecast */}
      <div className="bg-muted/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">AI Population Analysis</p>
        </div>
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground text-center">Analysing species at risk…</p>
          </div>
        ) : (
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-xs leading-relaxed [&>h2]:text-[11px] [&>h2]:font-bold [&>h2]:uppercase [&>h2]:tracking-wider [&>h2]:text-foreground [&>h2]:mt-4 [&>h2]:mb-1.5 [&>h2:first-child]:mt-0 [&>ul]:space-y-1 [&>p]:my-1">
            <ReactMarkdown>{result?.markdown ?? ''}</ReactMarkdown>
          </div>
        )}
      </div>

      <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed">
        Pressure score combines vessel count, MPA proximity, fishing density, and severity.
        Species analysis is AI-generated and indicative only.
      </p>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function HotspotPanel({ hotspot, onClose, onAskAI }) {
  const [tab, setTab] = useState('threat');

  // Reset to threat tab whenever a new hotspot is selected
  useEffect(() => {
    if (hotspot) setTab('threat');
  }, [hotspot?.id]);

  const sev = SEVERITY[hotspot?.severity] ?? SEVERITY.medium;

  return (
    <AnimatePresence>
      {hotspot && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="absolute top-4 bottom-4 right-4 w-[400px] max-w-[92vw] z-30 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full border', sev.bg)}>
                {sev.label.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">
                {hotspot.nearest_mpa ? `near ${hotspot.nearest_mpa}` : 'open water'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-border flex-shrink-0">
            {[
              { id: 'threat', label: 'Impact Analysis', icon: ShieldAlert },
              { id: 'species', label: 'Species Forecast', icon: Leaf },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors border-b-2',
                  tab === id
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'threat'
            ? <ThreatTab hotspot={hotspot} sev={sev} />
            : <SpeciesTab hotspot={hotspot} />
          }

          {/* Footer */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <button
              onClick={onAskAI}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Ask AI about this area
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

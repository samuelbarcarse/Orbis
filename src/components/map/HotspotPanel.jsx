// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { X, Loader2, Sparkles, MessageCircle, ShieldAlert, Ship, MapPin, AlertCircle, ExternalLink, HandHelping, Leaf } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { generateImpactSummary } from '@/lib/geminiClient';

const ACTIONS = [
  {
    title: 'Choose sustainable seafood',
    detail: 'Look for the blue MSC certified label when buying fish. Certified seafood comes from fisheries that are independently verified as sustainable and legal.',
    org: 'Marine Stewardship Council',
    search: 'Marine Stewardship Council sustainable seafood',
  },
  {
    title: 'Report suspicious vessel activity',
    detail: 'Global Fishing Watch lets the public monitor fishing vessels worldwide. You can flag suspicious activity and it reaches enforcement agencies.',
    org: 'Global Fishing Watch',
    search: 'Global Fishing Watch map',
  },
  {
    title: 'Support ocean conservation',
    detail: 'Organisations like Oceana and Sea Shepherd fund legal action, investigations, and campaigns that directly target illegal fishing fleets.',
    org: 'Oceana · Sea Shepherd',
    search: 'Oceana ocean conservation donate',
  },
  {
    title: 'Raise awareness',
    detail: 'Illegal fishing thrives in obscurity. Sharing information about where and why it happens pressures governments and retailers to act.',
    org: null,
    search: null,
  },
];

function buildReasons(h) {
  const reasons = [];

  reasons.push({
    headline: 'Tracking disabled',
    detail: `${h.vessel_count > 1 ? `All ${h.vessel_count} vessels have` : 'This vessel has'} switched off their AIS transponder — the GPS tracking system every commercial vessel is legally required to keep on. Turning it off is a known tactic to avoid coast guard detection.`,
  });

  if (h.in_mpa) {
    reasons.push({
      headline: `Fishing inside a protected area`,
      detail: `${h.nearest_mpa} is a Marine Protected Area (MPA) — a legally designated ocean sanctuary where fishing is banned to protect wildlife and ecosystems. Any vessel operating here is breaking international maritime law.`,
    });
  } else if (h.proximity_to_mpa_km <= 20) {
    reasons.push({
      headline: 'Operating on the edge of a protected zone',
      detail: `These vessels are only ${h.proximity_to_mpa_km} km from ${h.nearest_mpa ?? 'a marine reserve'}. Fishing this close to a protected boundary often exploits fish populations that breed and shelter inside the reserve — undermining conservation efforts.`,
    });
  }

  if (h.vessel_count >= 5) {
    reasons.push({
      headline: 'Coordinated fleet activity',
      detail: `${h.vessel_count} vessels operating together in the same area — all without tracking — is consistent with an organised illegal fishing fleet, sometimes called a "dark fleet." These operations can strip an area of fish in days.`,
    });
  } else {
    reasons.push({
      headline: 'Suspicious clustering',
      detail: `These vessels are tightly grouped, which typically means they are targeting a specific fish school. Combined with disabled tracking, this pattern is a strong indicator of illegal harvesting.`,
    });
  }

  return reasons;
}

const SEVERITY = {
  high:   { label: 'High Risk',      bg: 'bg-destructive/15 text-destructive border-destructive/30' },
  medium: { label: 'Elevated Risk',  bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  low:    { label: 'Low Risk',       bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
};

export default function HotspotPanel({ hotspot, onClose, onAskAI, onForecast }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hotspot) return;
    let cancelled = false;
    setLoading(true);
    setSummary('');
    generateImpactSummary(hotspot)
      .then((s) => { if (!cancelled) setSummary(s); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
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

          <div className="flex-1 overflow-auto">
            {/* Key facts */}
            <div className="p-5 space-y-3 border-b border-border">
              {/* Vessel count — hero metric */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Ship className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{hotspot.vessel_count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">dark vessels detected — no AIS signal</p>
                </div>
              </div>

              {/* MPA status */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  hotspot.in_mpa ? 'bg-destructive/10' : 'bg-muted'
                )}>
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

              {/* Location */}
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

            {/* Why is this flagged? */}
            <div className="p-5 space-y-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive">Why this is flagged</p>
              </div>
              <div className="space-y-3">
                {buildReasons(hotspot).map((r, i) => (
                  <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-semibold">{r.headline}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Impact Summary */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Environmental Impact</p>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Analysing impact…</span>
                </div>
              ) : (
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-xs leading-relaxed [&>h2]:text-[11px] [&>h2]:font-semibold [&>h2]:uppercase [&>h2]:tracking-wider [&>h2]:text-foreground [&>h2]:mt-3 [&>h2]:mb-1 [&>p]:my-1">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* What can you do? */}
            <div className="p-5 space-y-3 border-t border-border">
              <div className="flex items-center gap-2">
                <HandHelping className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">What you can do</p>
              </div>
              <div className="space-y-2">
                {ACTIONS.map((a, i) => (
                  <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-semibold">{a.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.detail}</p>
                    {a.search && (
                      <button
                        onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(a.search)}`, '_blank')}
                        className="mt-1.5 flex items-center gap-1 text-[10px] text-primary hover:underline"
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

          {/* Footer actions */}
          <div className="p-4 border-t border-border flex flex-col gap-2">
            <button
              onClick={onForecast}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-sm font-medium transition-colors"
            >
              <Leaf className="w-4 h-4" />
              View Species Population Forecast
            </button>
            <button
              onClick={onAskAI}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Ask AI about this hotspot
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

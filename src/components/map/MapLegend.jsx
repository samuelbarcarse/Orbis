// @ts-nocheck
import React from 'react';

const legends = {
  fishing: {
    title: 'Fishing Intensity',
    subtitle: 'Global Fishing Watch AIS',
    items: [
      { color: '#34d399', label: 'Low (<25%)' },
      { color: '#4fc3f7', label: 'Moderate (25–49%)' },
      { color: '#ffa94d', label: 'High (50–74%)' },
      { color: '#ff4d6d', label: 'Extreme (75%+)' },
    ],
  },
  sar: {
    title: 'SAR Detections',
    subtitle: 'Sentinel-1 × AIS delta',
    items: [
      { color: '#ff6b9d', label: 'Untracked vessel' },
      { color: '#ffa94d', label: 'Signal mismatch' },
    ],
  },
  hotspots: {
    title: 'Illegal Hotspots',
    subtitle: 'SciPy density clustering',
    items: [
      { color: '#ff4d6d', label: 'Severe cluster' },
      { color: '#ff6b9d', label: 'Watchlist cluster' },
    ],
  },
  protected: {
    title: 'Protected Areas',
    subtitle: 'UNEP-WCMC',
    items: [
      { color: '#34d399', label: 'Marine Protected Area' },
      { color: '#7a8aa3', label: 'Unprotected Zone' },
    ],
  },
  default: {
    title: 'Marine Risk Score',
    subtitle: 'OceanGuard AI',
    items: [
      { color: '#34d399', label: 'Low (0–24)' },
      { color: '#4fc3f7', label: 'Moderate (25–49)' },
      { color: '#ffa94d', label: 'High (50–74)' },
      { color: '#ff4d6d', label: 'Critical (75–100)' },
    ],
  },
};

export default function MapLegend({ activeLayers = [] }) {
  const key = ['fishing', 'sar', 'hotspots', 'protected'].find((l) => activeLayers.includes(l)) || 'default';
  const legend = legends[key];

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border/60 rounded-xl px-3 py-2.5 shadow-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/80 leading-none">
        {legend.title}
      </p>
      <p className="text-[9px] text-muted-foreground mb-2 mt-0.5">{legend.subtitle}</p>
      <div className="space-y-1.5">
        {legend.items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}80` }} />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

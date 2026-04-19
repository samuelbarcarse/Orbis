import React from 'react';

const legends = {
  fishing: {
    title: 'Fishing Intensity',
    subtitle: 'Global Fishing Watch AIS',
    items: [
      { color: '#10b981', label: 'Low (<25%)' },
      { color: '#0ea5e9', label: 'Moderate (25–49%)' },
      { color: '#f59e0b', label: 'High (50–74%)' },
      { color: '#ef4444', label: 'Extreme (75%+)' },
    ],
  },
  coral: {
    title: 'Coral Coverage',
    subtitle: 'NOAA CoRIS',
    items: [
      { color: '#ef4444', label: 'Critical (<5%)' },
      { color: '#f59e0b', label: 'Low (5–14%)' },
      { color: '#0ea5e9', label: 'Moderate (15–29%)' },
      { color: '#10b981', label: 'Healthy (30%+)' },
    ],
  },
  temperature: {
    title: 'Sea Surface Temp',
    subtitle: 'NOAA ERDDAP',
    items: [
      { color: '#8b5cf6', label: 'Cold (<10°C)' },
      { color: '#0ea5e9', label: 'Cool (10–21°C)' },
      { color: '#f59e0b', label: 'Warm (22–27°C)' },
      { color: '#ef4444', label: 'Hot / Bleaching Risk (28°C+)' },
    ],
  },
  biodiversity: {
    title: 'Biodiversity Index',
    subtitle: 'FISHGLOB / OBIS',
    items: [
      { color: '#ef4444', label: 'Critically Depleted (<4)' },
      { color: '#f59e0b', label: 'Stressed (4–5.9)' },
      { color: '#0ea5e9', label: 'Moderate (6–7.9)' },
      { color: '#10b981', label: 'Healthy (8+)' },
    ],
  },
  protected: {
    title: 'Protected Areas',
    subtitle: 'UNEP-WCMC',
    items: [
      { color: '#10b981', label: 'Marine Protected Area' },
      { color: '#94a3b8', label: 'Unprotected Zone' },
    ],
  },
  default: {
    title: 'Marine Risk Score',
    subtitle: 'OceanGuard AI Model',
    items: [
      { color: '#10b981', label: 'Low Risk (0–24)' },
      { color: '#0ea5e9', label: 'Moderate (25–49)' },
      { color: '#f59e0b', label: 'High (50–74)' },
      { color: '#ef4444', label: 'Critical (75–100)' },
    ],
  },
};

export default function MapLegend({ activeLayers = [] }) {
  const key = ['fishing', 'coral', 'temperature', 'biodiversity', 'protected'].find(l => activeLayers.includes(l)) || 'default';
  const legend = legends[key];

  return (
    <div className="bg-card/92 backdrop-blur-md border border-border rounded-lg px-3 py-2.5 shadow-lg">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 leading-none">{legend.title}</p>
      <p className="text-[9px] text-muted-foreground mb-2 mt-0.5">{legend.subtitle}</p>
      <div className="space-y-1.5">
        {legend.items.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5 border-t border-border/50">
        <p className="text-[9px] text-muted-foreground/60">Powered by Esri ArcGIS</p>
      </div>
    </div>
  );
}
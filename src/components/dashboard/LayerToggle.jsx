// @ts-nocheck
import React from 'react';
import { Fish, Shield, Ship, AlertTriangle, Radar, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const layers = [
  { id: 'alerts', label: 'Risk Score', icon: AlertTriangle, source: 'OceanGuard AI' },
  { id: 'fishing', label: 'Fishing Intensity', icon: Fish, source: 'Global Fishing Watch' },
  { id: 'vessels', label: 'AIS Vessels', icon: Ship, source: 'GFW AIS' },
  { id: 'sar', label: 'SAR Detections', icon: Radar, source: 'Sentinel-1' },
  { id: 'hotspots', label: 'Illegal Hotspots', icon: Flame, source: 'SciPy Cluster' },
  { id: 'protected', label: 'Protected Areas', icon: Shield, source: 'UNEP-WCMC' },
];

export default function LayerToggle({ activeLayers, onToggle }) {
  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl w-[240px] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-border/50">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/80">Data Layers</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">ESRI · GFW · Sentinel-1</p>
      </div>
      <div className="p-1.5">
        {layers.map((layer) => {
          const isActive = activeLayers.includes(layer.id);
          return (
            <button
              key={layer.id}
              onClick={() => onToggle(layer.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                isActive ? 'bg-primary/15 text-foreground' : 'text-foreground/60 hover:text-foreground hover:bg-muted/40',
              )}
            >
              <layer.icon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? 'text-primary' : 'text-foreground/50')} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-[11px] truncate', isActive && 'font-semibold')}>{layer.label}</p>
                <p className="text-[9px] text-muted-foreground truncate">{layer.source}</p>
              </div>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  isActive ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary))]' : 'bg-border',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

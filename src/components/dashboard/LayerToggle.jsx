import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Waves, Fish, Shield, Thermometer, Ship, AlertTriangle, Leaf, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const layers = [
  {
    id: 'fishing',
    label: 'Fishing Intensity',
    icon: Fish,
    color: 'text-chart-3',
    source: 'Global Fishing Watch',
    description: 'AIS & satellite vessel tracking from Global Fishing Watch. Colors markers by fishing pressure — red = extreme, green = low.',
  },
  {
    id: 'vessels',
    label: 'Vessel Anomalies',
    icon: Ship,
    color: 'text-chart-5',
    source: 'GFW AIS',
    description: 'Plots individual vessel alert positions from GFW AIS data. Dots colored by severity: red = high, yellow = medium.',
  },
  {
    id: 'coral',
    label: 'Coral Reefs',
    icon: Waves,
    color: 'text-destructive',
    source: 'NOAA CoRIS',
    description: 'Coral reef coverage from NOAA Coral Reef Information System. Green = healthy coverage, red = critically degraded.',
  },
  {
    id: 'temperature',
    label: 'Sea Surface Temp',
    icon: Thermometer,
    color: 'text-chart-1',
    source: 'NOAA ERDDAP',
    description: 'Ocean temperature from NOAA ERDDAP satellite datasets. Red = dangerously warm (bleaching risk), purple = polar cold.',
  },
  {
    id: 'biodiversity',
    label: 'Biodiversity Index',
    icon: Leaf,
    color: 'text-accent',
    source: 'FISHGLOB / OBIS',
    description: 'Species richness and population trends from the FISHGLOB and OBIS databases. Green = high diversity, red = critically depleted.',
  },
  {
    id: 'protected',
    label: 'Protected Areas',
    icon: Shield,
    color: 'text-accent',
    source: 'UNEP-WCMC',
    description: 'Marine Protected Area boundaries from the UNEP-WCMC global MPA database. Green = protected, grey = unprotected.',
  },
  {
    id: 'alerts',
    label: 'Risk Score Mode',
    icon: AlertTriangle,
    color: 'text-destructive',
    source: 'OceanGuard AI',
    description: 'Default view. Colors markers by the AI-computed Marine Risk Score combining all datasets. Red = critical, green = low.',
  },
];

export default function LayerToggle({ activeLayers, onToggle }) {
  const [expandedLayer, setExpandedLayer] = useState(null);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">ArcGIS Data Layers</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Powered by Esri · GFW · NOAA · FISHGLOB</p>
      </div>
      <div className="p-2 space-y-0.5">
        {layers.map(layer => {
          const isExpanded = expandedLayer === layer.id;
          const isActive = activeLayers.includes(layer.id);
          return (
            <div key={layer.id} className="rounded-lg overflow-hidden">
              <div className={cn(
                "flex items-center justify-between px-2 py-2 rounded-lg transition-colors",
                isActive ? 'bg-muted/60' : 'hover:bg-muted/30'
              )}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <layer.icon className={cn("w-3.5 h-3.5 flex-shrink-0", layer.color)} />
                  <div className="min-w-0">
                    <p className={cn("text-xs truncate", isActive ? 'font-semibold' : '')}>{layer.label}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{layer.source}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                  <button
                    onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => onToggle(layer.id)}
                  />
                </div>
              </div>
              {isExpanded && (
                <div className="mx-2 mb-1.5 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed bg-muted/30 rounded-lg border-l-2 border-primary/40">
                  {layer.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground/60">Note:</span> Coloring layers apply in order: Fishing → Coral → Temp → Biodiversity → Protected → Risk Score
        </p>
      </div>
    </div>
  );
}
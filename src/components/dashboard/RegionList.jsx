import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Ship } from 'lucide-react';
import { cn } from '@/lib/utils';
import RiskScoreGauge from './RiskScoreGauge';

const riskColors = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  moderate: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  low: 'bg-accent/10 text-accent border-accent/20',
};

export default function RegionList({ regions }) {
  const sorted = [...regions].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Monitored Regions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{regions.length} active zones</p>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-auto">
        {sorted.map(region => (
          <Link
            key={region.id}
            to={`/regions/${region.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
          >
            <RiskScoreGauge score={region.risk_score || 0} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{region.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={cn("text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full border", riskColors[region.risk_level] || riskColors.low)}>
                  {region.risk_level}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Ship className="w-3 h-3" />
                  {region.vessel_count || 0} vessels
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ))}
        {regions.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No regions monitored yet
          </div>
        )}
      </div>
    </div>
  );
}
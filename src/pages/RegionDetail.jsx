import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Thermometer, Fish, Waves, Shield, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import RiskScoreGauge from '../components/dashboard/RiskScoreGauge';
import RiskBreakdown from '../components/region/RiskBreakdown';
import RecoveryRecommendations from '../components/region/RecoveryRecommendations';
import VesselActivity from '../components/region/VesselActivity';
import GenerateReportButton from '../components/region/GenerateReportButton';

const recoveryLabels = {
  none: { label: 'No Intervention', color: 'bg-muted text-muted-foreground' },
  recommended: { label: 'Recommended', color: 'bg-chart-3/10 text-chart-3' },
  active: { label: 'Active Recovery', color: 'bg-accent/10 text-accent' },
  completed: { label: 'Completed', color: 'bg-primary/10 text-primary' },
};

export default function RegionDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/');
  const regionId = pathParts[pathParts.length - 1];

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: () => base44.entities.OceanRegion.list(),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.VesselAlert.list('-created_date', 100),
  });

  const region = regions.find(r => r.id === regionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!region) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Region not found</p>
        <Link to="/regions"><Button variant="outline">Back to Regions</Button></Link>
      </div>
    );
  }

  const recovery = recoveryLabels[region.recovery_status] || recoveryLabels.none;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/regions" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Regions
          </Link>
          <h1 className="text-xl font-bold">{region.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {region.ocean && (
              <Badge variant="outline" className="text-xs">{region.ocean} Ocean</Badge>
            )}
            <Badge className={cn("text-xs", recovery.color)}>{recovery.label}</Badge>
            {region.protected_area && (
              <Badge className="text-xs bg-accent/10 text-accent">Protected Area</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <GenerateReportButton region={region} />
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center">
          <RiskScoreGauge score={region.risk_score || 0} size="md" label="Risk Score" />
        </div>
        {[
          { label: 'Ocean Temp', value: `${region.ocean_temp || 0}°C`, icon: Thermometer, color: 'text-chart-3' },
          { label: 'Coral Coverage', value: `${region.coral_coverage || 0}%`, icon: Waves, color: 'text-destructive' },
          { label: 'Biodiversity', value: `${region.biodiversity_index || 0}/10`, icon: Fish, color: 'text-accent' },
          { label: 'Pop. Decline', value: `${region.population_decline || 0}%`, icon: Fish, color: 'text-chart-4' },
          { label: 'Area', value: `${(region.area_sq_km || 0).toLocaleString()} km²`, icon: MapPin, color: 'text-chart-1' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</span>
            </div>
            <p className="text-lg font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskBreakdown region={region} />
        <VesselActivity alerts={alerts} region={region} />
      </div>

      <RecoveryRecommendations region={region} />
    </div>
  );
}
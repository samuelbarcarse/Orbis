// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Ship, Radar, Waves } from 'lucide-react';
import { seedDataIfEmpty } from '../lib/seedData';

import Globe from '../components/map/Globe';
import LayerToggle from '../components/dashboard/LayerToggle';
import MapLegend from '../components/map/MapLegend';
import TimezoneOverlay from '../components/map/TimezoneOverlay';

const riskBadge = {
  critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  high: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  moderate: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeLayers, setActiveLayers] = useState(['alerts', 'vessels', 'hotspots']);
  const [seeding, setSeeding] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: () => base44.entities.OceanRegion.list('-risk_score'),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.VesselAlert.list('-created_date', 50),
  });

  useEffect(() => {
    if (!regionsLoading && regions.length === 0 && !seeding) {
      setSeeding(true);
      seedDataIfEmpty().then((seeded) => {
        if (seeded) {
          queryClient.invalidateQueries({ queryKey: ['regions'] });
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        }
        setSeeding(false);
      });
    }
  }, [regionsLoading, regions.length]);

  const toggleLayer = (id) =>
    setActiveLayers((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));

  if (regionsLoading || seeding) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          {seeding && <p className="text-sm text-muted-foreground">Initializing marine data...</p>}
        </div>
      </div>
    );
  }

  const criticalCount = regions.filter((r) => r.risk_level === 'critical').length;
  const activeAlerts = alerts.filter((a) => a.status === 'active').length;
  const sarFlags = regions.reduce((sum, r) => sum + (r.anomalous_vessels || 0), 0);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Globe
        regions={regions}
        alerts={alerts}
        activeLayers={activeLayers}
        onRegionClick={(r) => navigate(`/regions/${r.id}`)}
        onHoverRegion={setHoveredRegion}
      />

      {/* Top title strip */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto bg-card/40 backdrop-blur-xl border border-border/60 rounded-xl px-4 py-2.5 shadow-2xl">
          <h1 className="text-sm font-bold tracking-tight">Marine Risk Theater</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Global vessel intelligence · ESRI · GFW · Sentinel-1 SAR · MongoDB
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <StatPill icon={AlertTriangle} label="Critical zones" value={criticalCount} accent="text-rose-300" />
          <StatPill icon={Ship} label="Active alerts" value={activeAlerts} accent="text-amber-300" />
          <StatPill icon={Radar} label="SAR flags" value={sarFlags} accent="text-fuchsia-300" />
        </div>
      </div>

      {/* Left widget stack: layers + legend */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
        <LayerToggle activeLayers={activeLayers} onToggle={toggleLayer} />
        <MapLegend activeLayers={activeLayers} />
      </div>

      {/* Right widget: timezones */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
        <TimezoneOverlay />
      </div>

      {/* Hover card */}
      {hoveredRegion && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
            <Waves className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold">{hoveredRegion.name}</span>
              <span className="text-[9px] text-muted-foreground">
                {hoveredRegion.ocean} · Risk {Math.round(hoveredRegion.risk_score || 0)}/100
              </span>
            </div>
            <span
              className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                riskBadge[hoveredRegion.risk_level] || riskBadge.moderate
              }`}
            >
              {hoveredRegion.risk_level}
            </span>
            <span className="text-[9px] text-muted-foreground ml-1">click to open</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-card/40 backdrop-blur-xl border border-border/60 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2.5">
      <Icon className={`w-3.5 h-3.5 ${accent}`} />
      <div className="flex flex-col leading-tight">
        <span className={`text-sm font-bold ${accent}`}>{value}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

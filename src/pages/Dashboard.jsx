import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { seedDataIfEmpty } from '../lib/seedData';

import StatsOverview from '../components/dashboard/StatsOverview';
import RegionList from '../components/dashboard/RegionList';
import LayerToggle from '../components/dashboard/LayerToggle';
import OceanMap from '../components/map/OceanMap';
import MapLegend from '../components/map/MapLegend';
import TimeSlider from '../components/map/TimeSlider';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeLayers, setActiveLayers] = useState(['fishing', 'alerts']);
  const [seeding, setSeeding] = useState(false);
  const [timeIndex, setTimeIndex] = useState(6);

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

  const toggleLayer = (id) => {
    setActiveLayers(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  if (regionsLoading || seeding) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          {seeding && <p className="text-sm text-muted-foreground">Initializing marine data...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Marine Risk Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Global ecosystem monitoring · Esri ArcGIS · GFW · NOAA · FISHGLOB</p>
        </div>
      </div>

      {/* Stats */}
      <StatsOverview regions={regions} alerts={alerts} />

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <div className="lg:col-span-3 relative">
          <div className="h-[500px]">
            <OceanMap
              regions={regions}
              activeLayers={activeLayers}
              alerts={alerts}
              onRegionClick={(r) => navigate(`/regions/${r.id}`)}
              timeOffset={timeIndex - 6}
            />
          </div>
          <div className="absolute bottom-4 left-4 z-[400] flex flex-col gap-2 items-start">
            <MapLegend activeLayers={activeLayers} />
          </div>
          <div className="absolute bottom-4 right-4 z-[400]">
            <TimeSlider value={timeIndex} onChange={setTimeIndex} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <LayerToggle activeLayers={activeLayers} onToggle={toggleLayer} />
          <RegionList regions={regions} />
        </div>
      </div>
    </div>
  );
}
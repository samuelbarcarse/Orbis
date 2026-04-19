import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Loader2, Search, Filter, MapPin, Ship, Waves } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import RiskScoreGauge from '../components/dashboard/RiskScoreGauge';

const riskColors = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  moderate: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  low: 'bg-accent/10 text-accent border-accent/20',
};

export default function Regions() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [oceanFilter, setOceanFilter] = useState('all');

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: () => base44.entities.OceanRegion.list('-risk_score'),
  });

  const filtered = regions.filter(r => {
    const matchSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || r.risk_level === riskFilter;
    const matchOcean = oceanFilter === 'all' || r.ocean === oceanFilter;
    return matchSearch && matchRisk && matchOcean;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Ocean Regions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Explore and monitor marine ecosystem zones</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search regions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={oceanFilter} onValueChange={setOceanFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Ocean" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Oceans</SelectItem>
            <SelectItem value="Pacific">Pacific</SelectItem>
            <SelectItem value="Atlantic">Atlantic</SelectItem>
            <SelectItem value="Indian">Indian</SelectItem>
            <SelectItem value="Arctic">Arctic</SelectItem>
            <SelectItem value="Southern">Southern</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(region => (
          <Link
            key={region.id}
            to={`/regions/${region.id}`}
            className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{region.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn("text-[10px]", riskColors[region.risk_level])}>
                    {region.risk_level}
                  </Badge>
                  {region.ocean && (
                    <span className="text-xs text-muted-foreground">{region.ocean}</span>
                  )}
                </div>
              </div>
              <RiskScoreGauge score={region.risk_score || 0} size="sm" />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Fishing</p>
                <p className="text-sm font-semibold">{region.fishing_intensity || 0}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vessels</p>
                <p className="text-sm font-semibold">{region.vessel_count || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Biodiversity</p>
                <p className="text-sm font-semibold">{region.biodiversity_index || 0}/10</p>
              </div>
            </div>

            {region.protected_area && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-accent">
                <Waves className="w-3 h-3" />
                Marine Protected Area
              </div>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No regions match your filters</p>
        </div>
      )}
    </div>
  );
}
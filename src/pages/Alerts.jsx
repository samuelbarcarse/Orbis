import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertTriangle, Search, Ship, Radio, Clock, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const alertTypeConfig = {
  ais_gap: { icon: Radio, label: 'AIS Gap', color: 'bg-destructive/10 text-destructive' },
  loitering: { icon: Clock, label: 'Loitering', color: 'bg-chart-3/10 text-chart-3' },
  speed_anomaly: { icon: Navigation, label: 'Speed Anomaly', color: 'bg-chart-1/10 text-chart-1' },
  boundary_violation: { icon: AlertTriangle, label: 'Boundary Violation', color: 'bg-destructive/10 text-destructive' },
  dark_vessel: { icon: Ship, label: 'Dark Vessel', color: 'bg-chart-5/10 text-chart-5' },
};

const severityColors = {
  low: 'bg-accent/10 text-accent border-accent/20',
  medium: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusColors = {
  active: 'bg-destructive/10 text-destructive',
  investigating: 'bg-chart-3/10 text-chart-3',
  resolved: 'bg-accent/10 text-accent',
  dismissed: 'bg-muted text-muted-foreground',
};

export default function Alerts() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.VesselAlert.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VesselAlert.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const filtered = alerts.filter(a => {
    const matchSearch = !search || a.vessel_name?.toLowerCase().includes(search.toLowerCase()) || a.region_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || a.alert_type === typeFilter;
    const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
    return matchSearch && matchType && matchSeverity;
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
        <h1 className="text-xl font-bold">Vessel Alerts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Anomalous vessel behavior detection</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vessels or regions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Alert Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ais_gap">AIS Gap</SelectItem>
            <SelectItem value="loitering">Loitering</SelectItem>
            <SelectItem value="speed_anomaly">Speed Anomaly</SelectItem>
            <SelectItem value="boundary_violation">Boundary Violation</SelectItem>
            <SelectItem value="dark_vessel">Dark Vessel</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map(alert => {
          const config = alertTypeConfig[alert.alert_type] || alertTypeConfig.ais_gap;
          const Icon = config.icon;
          return (
            <div key={alert.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{alert.vessel_name}</span>
                    <Badge variant="outline" className={cn("text-[10px]", severityColors[alert.severity])}>
                      {alert.severity}
                    </Badge>
                    <Badge className={cn("text-[10px]", statusColors[alert.status])}>
                      {alert.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {config.label} • {alert.region_name}
                    {alert.duration_hours && ` • ${alert.duration_hours}h duration`}
                  </p>
                  {alert.description && (
                    <p className="text-sm text-muted-foreground mt-2">{alert.description}</p>
                  )}
                  {alert.created_date && (
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(alert.created_date), 'MMM d, yyyy HH:mm')}</p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {alert.status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => updateMutation.mutate({ id: alert.id, data: { status: 'investigating' } })}
                      >
                        Investigate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => updateMutation.mutate({ id: alert.id, data: { status: 'dismissed' } })}
                      >
                        Dismiss
                      </Button>
                    </>
                  )}
                  {alert.status === 'investigating' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => updateMutation.mutate({ id: alert.id, data: { status: 'resolved' } })}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No alerts match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
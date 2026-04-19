import React from 'react';
import { Ship, AlertTriangle, Radio, Clock, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const alertTypeConfig = {
  ais_gap: { icon: Radio, label: 'AIS Gap', color: 'text-destructive bg-destructive/10' },
  loitering: { icon: Clock, label: 'Loitering', color: 'text-chart-3 bg-chart-3/10' },
  speed_anomaly: { icon: Navigation, label: 'Speed Anomaly', color: 'text-chart-1 bg-chart-1/10' },
  boundary_violation: { icon: AlertTriangle, label: 'Boundary Violation', color: 'text-destructive bg-destructive/10' },
  dark_vessel: { icon: Ship, label: 'Dark Vessel', color: 'text-chart-5 bg-chart-5/10' },
};

const severityColors = {
  low: 'bg-accent/10 text-accent border-accent/20',
  medium: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function VesselActivity({ alerts, region }) {
  const regionAlerts = alerts.filter(a => a.region_name === region.name);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Vessel Activity & Alerts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {region.vessel_count || 0} vessels • {region.anomalous_vessels || 0} anomalous
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-muted-foreground" />
          <span className="text-lg font-bold">{region.vessel_count || 0}</span>
        </div>
      </div>

      <div className="divide-y divide-border max-h-[300px] overflow-auto">
        {regionAlerts.map(alert => {
          const config = alertTypeConfig[alert.alert_type] || alertTypeConfig.ais_gap;
          const Icon = config.icon;
          return (
            <div key={alert.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{alert.vessel_name}</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", severityColors[alert.severity])}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{config.label}</p>
                  {alert.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>
                  )}
                </div>
                {alert.duration_hours && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {alert.duration_hours}h
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {regionAlerts.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No vessel alerts for this region
          </div>
        )}
      </div>
    </div>
  );
}
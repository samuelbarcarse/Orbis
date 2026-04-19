import React from 'react';
import { Waves, AlertTriangle, Shield, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatsOverview({ regions, alerts }) {
  const avgRisk = regions.length 
    ? Math.round(regions.reduce((sum, r) => sum + (r.risk_score || 0), 0) / regions.length) 
    : 0;
  const criticalCount = regions.filter(r => r.risk_level === 'critical').length;
  const protectedCount = regions.filter(r => r.protected_area).length;
  const activeAlerts = alerts.filter(a => a.status === 'active').length;

  const stats = [
    { 
      label: 'Avg Risk Score', 
      value: avgRisk, 
      suffix: '/100',
      icon: Waves,
      color: avgRisk > 70 ? 'text-destructive' : avgRisk > 40 ? 'text-chart-3' : 'text-accent',
      bgColor: avgRisk > 70 ? 'bg-destructive/10' : avgRisk > 40 ? 'bg-chart-3/10' : 'bg-accent/10',
    },
    { 
      label: 'Critical Zones', 
      value: criticalCount, 
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    { 
      label: 'Protected Areas', 
      value: protectedCount,
      icon: Shield,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    { 
      label: 'Active Alerts', 
      value: activeAlerts,
      icon: AlertTriangle,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bgColor)}>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-2xl font-bold", stat.color)}>{stat.value}</span>
            {stat.suffix && <span className="text-sm text-muted-foreground">{stat.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
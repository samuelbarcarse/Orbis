import React from 'react';
import { cn } from '@/lib/utils';

export default function RiskScoreGauge({ score, size = 'md', label }) {
  const radius = size === 'lg' ? 54 : size === 'md' ? 40 : 28;
  const stroke = size === 'lg' ? 8 : size === 'md' ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - score) / 100) * circumference;
  const dim = (radius + stroke) * 2;

  const getColor = (s) => {
    if (s >= 75) return { ring: 'stroke-destructive', text: 'text-destructive', label: 'Critical' };
    if (s >= 50) return { ring: 'stroke-chart-3', text: 'text-chart-3', label: 'High' };
    if (s >= 25) return { ring: 'stroke-chart-1', text: 'text-chart-1', label: 'Moderate' };
    return { ring: 'stroke-accent', text: 'text-accent', label: 'Low' };
  };

  const colors = getColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            className={colors.ring}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "font-bold",
            colors.text,
            size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'
          )}>
            {score}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <span className={cn("text-[10px] font-semibold uppercase tracking-wider", colors.text)}>
        {colors.label}
      </span>
    </div>
  );
}
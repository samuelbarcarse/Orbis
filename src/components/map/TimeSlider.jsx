import React from 'react';
import { Clock } from 'lucide-react';

const months = ['Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025'];

export default function TimeSlider({ value, onChange }) {
  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5 min-w-[240px]">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time Window</p>
        <span className="ml-auto text-[11px] font-semibold text-primary">{months[value]}</span>
      </div>
      <input
        type="range"
        min={0}
        max={months.length - 1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(value / (months.length - 1)) * 100}%, hsl(var(--border)) ${(value / (months.length - 1)) * 100}%, hsl(var(--border)) 100%)`
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">{months[0]}</span>
        <span className="text-[9px] text-muted-foreground">{months[months.length - 1]}</span>
      </div>
    </div>
  );
}
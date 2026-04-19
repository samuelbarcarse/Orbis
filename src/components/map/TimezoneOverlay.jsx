import React, { useEffect, useState } from 'react';
import { Clock3, Globe2 } from 'lucide-react';

// Curated ring of vessel-activity timezones — matches the regions our
// MongoDB store tracks most heavily. Names match ESRI timezone layer labels.
const ZONES = [
  { id: 'UTC', label: 'UTC', offset: 0 },
  { id: 'Asia/Singapore', label: 'SGT · S. China Sea', offset: 8 },
  { id: 'Pacific/Port_Moresby', label: 'PGT · Coral Triangle', offset: 10 },
  { id: 'Africa/Lagos', label: 'WAT · Gulf of Guinea', offset: 1 },
  { id: 'America/Guayaquil', label: 'ECT · Galápagos', offset: -5 },
];

const formatTime = (offset, now) => {
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const d = new Date(utc + offset * 3_600_000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const isNight = (offset, now) => {
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const d = new Date(utc + offset * 3_600_000);
  const h = d.getHours();
  return h < 6 || h >= 19;
};

export default function TimezoneOverlay() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border/60 rounded-xl p-3 shadow-2xl min-w-[240px]">
      <div className="flex items-center gap-2 mb-2.5">
        <Globe2 className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
          Live Timezones
        </p>
        <span className="ml-auto text-[9px] text-muted-foreground">ESRI · MongoDB</span>
      </div>

      <div className="space-y-1.5">
        {ZONES.map((z) => {
          const night = isNight(z.offset, now);
          return (
            <div key={z.id} className="flex items-center gap-2 text-[11px]">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  night ? 'bg-indigo-400/80' : 'bg-amber-300/90'
                }`}
              />
              <span className="text-foreground/80 flex-1 truncate">{z.label}</span>
              <span className="font-mono text-foreground tabular-nums">
                {formatTime(z.offset, now)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center gap-1.5">
        <Clock3 className="w-3 h-3 text-muted-foreground" />
        <span className="text-[9px] text-muted-foreground">
          Day/night terminator syncs to UTC {now.toISOString().slice(11, 16)}
        </span>
      </div>
    </div>
  );
}

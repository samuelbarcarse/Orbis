// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ship, Anchor, Flag, Gauge, Clock, Tag, Wrench, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

// Convert a 2-letter ISO country code to a flag emoji
function flagEmoji(code) {
  if (!code || code.length !== 2) return '🏳️';
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  ).join('');
}

// Format an ISO timestamp to a readable date string
function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Row({ icon: Icon, label, value, tone = 'text-foreground' }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <Icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex flex-col leading-tight gap-0.5 min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`text-xs font-medium ${tone} break-words`}>{value}</span>
      </div>
    </div>
  );
}

export default function VesselPanel({ vessel, onClose, watchlist = [], onToggleWatch }) {
  const { getToken } = useAuth();
  const [info, setInfo]       = useState(undefined);
  const [loading, setLoading] = useState(false);
  const isWatched = watchlist.some((w) => (w.mmsi && w.mmsi === vessel?.mmsi) || w.id === vessel?.id);

  // Fetch extra vessel details whenever a vessel is selected
  useEffect(() => {
    if (!vessel?.mmsi) { setInfo(null); return; }

    setInfo(undefined);
    setLoading(true);

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/vessels/info?mmsi=${vessel.mmsi}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setInfo(data); // null if GFW returned nothing
      } catch {
        setInfo(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [vessel?.mmsi, getToken]);

  return (
    <AnimatePresence>
      {vessel && (
        <motion.div
          key="vessel-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="absolute right-4 top-20 bottom-20 w-72 z-30 flex flex-col
                     bg-background/80 backdrop-blur-xl border border-border/60
                     rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <Ship className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold truncate">
                {vessel.name && vessel.name !== 'Unknown Vessel' ? vessel.name : 'Unknown Vessel'}
              </h2>
              <p className="text-[10px] text-muted-foreground">AIS Fishing Vessel</p>
            </div>
            <button
              onClick={() => onToggleWatch?.(vessel)}
              title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                isWatched
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {isWatched ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">

            {/* Always-available data from the GeoJSON event properties */}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              From AIS signal
            </p>

            {vessel.mmsi && (
              <Row icon={Tag} label="MMSI" value={vessel.mmsi} />
            )}
            {vessel.flag && (
              <Row
                icon={Flag}
                label="Flag"
                value={`${flagEmoji(vessel.flag)} ${vessel.flag}`}
              />
            )}
            {vessel.speed_knots != null && (
              <Row
                icon={Gauge}
                label="Avg speed"
                value={`${Number(vessel.speed_knots).toFixed(1)} kn`}
              />
            )}
            {vessel.timestamp && (
              <Row
                icon={Clock}
                label="Event date"
                value={fmtDate(vessel.timestamp)}
              />
            )}

            {/* Divider */}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-4 mb-2">
              Registry lookup
            </p>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center gap-2 py-3 text-muted-foreground">
                <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Querying GFW registry…</span>
              </div>
            )}

            {/* Not found */}
            {!loading && info === null && (
              <div className="flex items-start gap-2 py-2 text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="text-xs">Not found in GFW vessel registry</span>
              </div>
            )}

            {/* Registry data */}
            {!loading && info && (
              <>
                {info.shipname && (
                  <Row icon={Ship} label="Registered name" value={info.shipname} />
                )}
                {info.imo && (
                  <Row icon={Anchor} label="IMO number" value={info.imo} />
                )}
                {info.callsign && (
                  <Row icon={Tag} label="Call sign" value={info.callsign} />
                )}
                {info.flag && (
                  <Row
                    icon={Flag}
                    label="Registry flag"
                    value={`${flagEmoji(info.flag)} ${info.flag}`}
                  />
                )}
                {info.geartype && (
                  <Row icon={Wrench} label="Gear type" value={info.geartype.replace(/_/g, ' ')} />
                )}
                {info.shiptype && (
                  <Row icon={Ship} label="Ship type" value={info.shiptype} />
                )}
                {info.owner && (
                  <Row icon={User} label="Owner" value={info.owner} />
                )}
                {info.first_seen && (
                  <Row icon={Clock} label="First AIS seen" value={fmtDate(info.first_seen)} />
                )}
                {info.last_seen && (
                  <Row icon={Clock} label="Last AIS seen" value={fmtDate(info.last_seen)} />
                )}

                {/* If registry returned but all detail fields are empty */}
                {!info.shipname && !info.imo && !info.callsign && !info.geartype && !info.owner && (
                  <div className="flex items-start gap-2 py-2 text-muted-foreground">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="text-xs">Not found in GFW vessel registry</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/50 shrink-0 space-y-2">
            <button
              onClick={() => onToggleWatch?.(vessel)}
              className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg
                         text-xs font-semibold transition-colors border ${
                isWatched
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-400'
                  : 'bg-muted/40 hover:bg-muted border-border/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {isWatched ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            </button>

            {vessel.mmsi && (
              <a
                href={`https://globalfishingwatch.org/map/?vessel=${vessel.mmsi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                           bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30
                           text-sky-400 text-xs font-semibold transition-colors"
              >
                <Ship className="w-3.5 h-3.5" />
                View on Global Fishing Watch
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

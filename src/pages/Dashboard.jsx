// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { Ship, Radar, AlertTriangle, MousePointerClick, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import EsriScene from '../components/map/EsriScene';
import HotspotPanel from '../components/map/HotspotPanel';
import VesselPanel from '../components/map/VesselPanel';
import WatchlistPanel from '../components/map/WatchlistPanel';
import ChatAssistant from '../components/ai/ChatAssistant';

export default function Dashboard() {
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [stats, setStats] = useState({ vessels: 0, darkVessels: 0, hotspots: 0 });
  const [showHint, setShowHint] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const sceneRef = useRef(null);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbis:watchlist') || '[]'); } catch { return []; }
  });

  const toggleWatch = (vessel) => {
    setWatchlist((prev) => {
      const exists = prev.some((w) => (w.mmsi && w.mmsi === vessel.mmsi) || w.id === vessel.id);
      const next = exists
        ? prev.filter((w) => w.id !== vessel.id && w.mmsi !== vessel.mmsi)
        : [...prev, vessel];
      localStorage.setItem('orbis:watchlist', JSON.stringify(next));
      sceneRef.current?.updateWatchlist(next);
      return next;
    });
  };

  useEffect(() => {
    if (selectedHotspot) setShowHint(false);
  }, [selectedHotspot]);

  const handleDataLoaded = ({ vessels, detections, hotspots }) => {
    // Re-apply watchlist markers after scene reloads
    setTimeout(() => sceneRef.current?.updateWatchlist(watchlist), 500);
    const dark = (detections?.features || []).filter((f) => f.properties?.is_dark).length;
    setStats({
      vessels: vessels?.features?.length || 0,
      darkVessels: dark,
      hotspots: hotspots?.features?.length || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-[#060b19] overflow-hidden">
      <EsriScene
        ref={sceneRef}
        onSelectHotspot={(h) => { setSelectedHotspot(h); setSelectedVessel(null); }}
        onSelectVessel={(v) => { setSelectedVessel(v); setSelectedHotspot(null); }}
        onDataLoaded={handleDataLoaded}
      />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-4 pointer-events-none z-20">
        <div className="pointer-events-auto bg-background/60 backdrop-blur-xl border border-border/60 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
          <img src="/logo.png" alt="Orbis" className="w-7 h-7 rounded-lg object-cover" />
          <div>
            <h1 className="text-sm font-bold tracking-tight">Orbis</h1>
            <p className="text-[10px] text-muted-foreground">Ocean Wildlife Monitor</p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => sceneRef.current?.resetCamera()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-xl shadow-2xl text-xs font-semibold transition-all bg-background/60 border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset View
          </button>

          <div className="bg-background/60 backdrop-blur-xl border border-border/60 rounded-xl px-2 py-1.5 shadow-2xl">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>

      {/* Instruction badge */}
      <AnimatePresence>
        {showHint && stats.hotspots > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 1.2, duration: 0.4 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-background/70 backdrop-blur-xl border border-border/60 rounded-full px-4 py-2 shadow-xl">
              <MousePointerClick className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">
                Click a <span className="text-destructive font-semibold">red hotspot</span> to open impact &amp; species analysis
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom-left stats */}
      <div className="absolute bottom-4 left-4 flex gap-2 pointer-events-auto z-20">
        <StatTile icon={Ship} label="AIS Vessels" value={stats.vessels} tone="text-sky-300" />
        <StatTile icon={AlertTriangle} label="Vessel Clusters" value={stats.darkVessels} tone="text-rose-300" />
        <StatTile icon={Radar} label="Hotspots" value={stats.hotspots} tone="text-amber-300" />
      </div>

      {/* Watchlist sidebar — left */}
      <WatchlistPanel
        watchlist={watchlist}
        onRemove={toggleWatch}
        onSelect={(v) => {
          setSelectedVessel(v);
          sceneRef.current?.zoomToVessel(v);
        }}
      />

      {/* Vessel detail panel — opens when a ship icon is clicked */}
      <VesselPanel
        vessel={selectedVessel}
        onClose={() => setSelectedVessel(null)}
        watchlist={watchlist}
        onToggleWatch={toggleWatch}
      />

      {/* Tabbed hotspot panel (Threat Analysis + Species Forecast) */}
      <HotspotPanel
        hotspot={selectedHotspot}
        onClose={() => setSelectedHotspot(null)}
        onAskAI={() => setChatOpen(true)}
      />

      {/* Floating AI chat */}
      <ChatAssistant
        selectedHotspot={selectedHotspot}
        open={chatOpen}
        onOpenChange={setChatOpen}
      />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-background/60 backdrop-blur-xl border border-border/60 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2.5 min-w-[120px]">
      <Icon className={`w-4 h-4 ${tone}`} />
      <div className="flex flex-col leading-tight">
        <span className={`text-sm font-bold ${tone}`}>{value}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

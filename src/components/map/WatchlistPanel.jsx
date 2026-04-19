// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Ship, Flag, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

function flagEmoji(code) {
  if (!code || code.length !== 2) return '';
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  ).join('');
}

export default function WatchlistPanel({ watchlist, onRemove, onSelect }) {
  return (
    <motion.div
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="absolute top-20 left-4 bottom-4 w-56 z-20 flex flex-col
                 bg-background/80 backdrop-blur-xl border border-border/60
                 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border/50 shrink-0">
        <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <p className="text-xs font-bold flex-1">Watchlist</p>
        <span className="text-[10px] font-semibold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full">
          {watchlist.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        <AnimatePresence>
          {watchlist.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-32 gap-2 text-center"
            >
              <Eye className="w-6 h-6 text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Click a vessel then<br />flag it to add it here
              </p>
            </motion.div>
          )}

          {watchlist.map((v) => (
            <motion.div
              key={v.id ?? v.mmsi}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="group bg-muted/40 hover:bg-muted/70 border border-border/40
                         hover:border-rose-500/40 rounded-xl p-2.5 cursor-pointer
                         transition-all relative"
              onClick={() => onSelect?.(v)}
            >
              {/* Red dot indicator */}
              <span className="absolute top-2 right-7 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]" />

              {/* Remove */}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(v); }}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100
                           p-0.5 rounded hover:bg-muted transition-all"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>

              <p className="text-xs font-semibold leading-tight truncate pr-5">
                {v.name && v.name !== 'Unknown Vessel' ? v.name : 'Unknown Vessel'}
              </p>

              <div className="mt-1 space-y-0.5">
                {v.flag && (
                  <p className="text-[10px] text-muted-foreground">
                    {flagEmoji(v.flag)} {v.flag}
                  </p>
                )}
                {v.mmsi && (
                  <p className="text-[10px] text-muted-foreground font-mono">{v.mmsi}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

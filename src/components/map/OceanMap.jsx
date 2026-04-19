import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, ScaleControl } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

function MapBounds({ regions }) {
  const map = useMap();
  useEffect(() => {
    if (regions.length > 0) {
      const bounds = regions.map(r => [r.latitude, r.longitude]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 5 });
    }
  }, [regions, map]);
  return null;
}

function getMarkerStyle(region, activeLayers) {
  if (activeLayers.includes('fishing')) {
    const v = region.fishing_intensity || 0;
    const color = v >= 75 ? '#ef4444' : v >= 50 ? '#f59e0b' : v >= 25 ? '#0ea5e9' : '#10b981';
    return { color, metricLabel: 'Fishing Intensity', metricValue: `${v}%`, source: 'Global Fishing Watch' };
  }
  if (activeLayers.includes('coral')) {
    const v = region.coral_coverage || 0;
    const color = v >= 30 ? '#10b981' : v >= 15 ? '#0ea5e9' : v >= 5 ? '#f59e0b' : '#ef4444';
    return { color, metricLabel: 'Coral Coverage', metricValue: `${v}%`, source: 'NOAA CoRIS' };
  }
  if (activeLayers.includes('temperature')) {
    const v = region.ocean_temp || 0;
    const color = v >= 28 ? '#ef4444' : v >= 22 ? '#f59e0b' : v >= 10 ? '#0ea5e9' : '#8b5cf6';
    return { color, metricLabel: 'Sea Surface Temp', metricValue: `${v}°C`, source: 'NOAA ERDDAP' };
  }
  if (activeLayers.includes('protected')) {
    const color = region.protected_area ? '#10b981' : '#94a3b8';
    return { color, metricLabel: 'MPA Status', metricValue: region.protected_area ? 'Protected' : 'Unprotected', source: 'UNEP-WCMC' };
  }
  if (activeLayers.includes('biodiversity')) {
    const v = region.biodiversity_index || 0;
    const color = v >= 8 ? '#10b981' : v >= 6 ? '#0ea5e9' : v >= 4 ? '#f59e0b' : '#ef4444';
    return { color, metricLabel: 'Biodiversity Index', metricValue: `${v}/10`, source: 'FISHGLOB / OBIS' };
  }
  // Default: risk score
  const s = region.risk_score || 0;
  const color = s >= 75 ? '#ef4444' : s >= 50 ? '#f59e0b' : s >= 25 ? '#0ea5e9' : '#10b981';
  return { color, metricLabel: 'Marine Risk Score', metricValue: `${s}/100`, source: 'OceanGuard AI' };
}

const BASEMAPS = {
  ocean: {
    label: 'Esri Ocean',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — GEBCO, NOAA, NGA',
    maxZoom: 13,
  },
  imagery: {
    label: 'Esri Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Earthstar Geographics',
    maxZoom: 19,
  },
  topo: {
    label: 'Esri Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — USGS, NGA',
    maxZoom: 13,
  },
};

export default function OceanMap({ regions, activeLayers, alerts = [], onRegionClick, timeOffset = 0 }) {
  const [basemap, setBasemap] = useState('ocean');
  const showVessels = activeLayers.includes('vessels');
  const bm = BASEMAPS[basemap];

  // Simulate temporal variation: shift risk scores slightly based on timeOffset
  const adjustedRegions = regions.map(r => ({
    ...r,
    risk_score: Math.min(100, Math.max(0, (r.risk_score || 0) + timeOffset * 0.5)),
    fishing_intensity: Math.min(100, Math.max(0, (r.fishing_intensity || 0) + timeOffset * 0.3)),
  }));

  return (
    <div className="rounded-xl overflow-hidden border border-border h-full min-h-[400px] relative">
      {/* Basemap switcher */}
      <div className="absolute top-3 right-3 z-[500] flex gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1">
        {Object.entries(BASEMAPS).map(([key, bm]) => (
          <button
            key={key}
            onClick={() => setBasemap(key)}
            className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
              basemap === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {bm.label}
          </button>
        ))}
      </div>

      {/* Data source badge */}
      <div className="absolute top-3 left-3 z-[500] flex gap-1.5 flex-wrap max-w-[280px]">
        {activeLayers.includes('fishing') && (
          <span className="text-[9px] font-semibold bg-chart-3/20 text-chart-3 border border-chart-3/30 px-1.5 py-0.5 rounded-full">
            ⚓ Global Fishing Watch AIS
          </span>
        )}
        {(activeLayers.includes('coral') || activeLayers.includes('temperature')) && (
          <span className="text-[9px] font-semibold bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full">
            🌊 NOAA Data
          </span>
        )}
        {activeLayers.includes('biodiversity') && (
          <span className="text-[9px] font-semibold bg-accent/20 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full">
            🐟 FISHGLOB / OBIS
          </span>
        )}
        {activeLayers.includes('protected') && (
          <span className="text-[9px] font-semibold bg-accent/20 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full">
            🛡 UNEP-WCMC MPA
          </span>
        )}
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="h-full w-full"
        style={{ minHeight: '400px' }}
        zoomControl={true}
      >
        <TileLayer
          key={basemap}
          url={bm.url}
          attribution={bm.attribution}
          maxZoom={bm.maxZoom}
        />
        {basemap === 'ocean' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            maxZoom={13}
            opacity={0.6}
          />
        )}

        <ScaleControl position="bottomright" />
        <MapBounds regions={adjustedRegions} />

        {/* Region markers */}
        {adjustedRegions.map(region => {
          const style = getMarkerStyle(region, activeLayers);
          const radius = Math.max(9, Math.min(30, (region.risk_score || 0) / 3.2));

          return (
            <CircleMarker
              key={region.id}
              center={[region.latitude, region.longitude]}
              radius={radius}
              fillColor={style.color}
              color={style.color}
              weight={2}
              opacity={0.9}
              fillOpacity={0.35}
              eventHandlers={{ click: () => onRegionClick?.(region) }}
            >
              <Popup maxWidth={220}>
                <div className="text-sm min-w-[200px]">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-base leading-tight">{region.name}</p>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0" style={{ backgroundColor: style.color + '25', color: style.color, border: `1px solid ${style.color}50` }}>
                      {region.risk_level?.toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-2 px-2 py-1.5 rounded" style={{ backgroundColor: style.color + '15' }}>
                    <p className="text-[10px] opacity-60 mb-0.5">{style.metricLabel} · {style.source}</p>
                    <p className="font-bold text-sm" style={{ color: style.color }}>{style.metricValue}</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-60">Marine Risk Score</span>
                      <span className="font-semibold">{Math.round(region.risk_score)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Fishing Intensity</span>
                      <span>{region.fishing_intensity || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Coral Coverage</span>
                      <span>{region.coral_coverage || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Sea Temp</span>
                      <span>{region.ocean_temp || 0}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Biodiversity</span>
                      <span>{region.biodiversity_index || 0}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Active Vessels</span>
                      <span>{region.vessel_count || 0} <span className="text-destructive">({region.anomalous_vessels || 0} anomalous)</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Population Decline</span>
                      <span>{region.population_decline || 0}%</span>
                    </div>
                  </div>

                  <Link
                    to={`/regions/${region.id}`}
                    className="mt-2.5 block text-center text-xs font-semibold py-1.5 rounded transition-colors"
                    style={{ backgroundColor: style.color + '20', color: style.color }}
                  >
                    Full Analysis & Recovery Plan →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Vessel alert markers */}
        {showVessels && alerts
          .filter(a => a.latitude && a.longitude && a.status === 'active')
          .map(alert => {
            const color = alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#94a3b8';
            return (
              <CircleMarker
                key={`alert-${alert.id}`}
                center={[alert.latitude, alert.longitude]}
                radius={5}
                fillColor={color}
                color="#fff"
                weight={1.5}
                opacity={1}
                fillOpacity={0.95}
              >
                <Popup maxWidth={200}>
                  <div className="text-sm min-w-[170px]">
                    <p className="font-bold mb-0.5">🚢 {alert.vessel_name}</p>
                    <p className="text-[10px] opacity-60 uppercase tracking-wide mb-1">{alert.alert_type.replace(/_/g, ' ')} · GFW AIS</p>
                    <p className="text-xs">{alert.description}</p>
                    <p className="text-xs mt-1.5 font-semibold capitalize" style={{ color }}>
                      ● {alert.severity} severity · {alert.duration_hours}h
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
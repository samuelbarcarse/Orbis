// @ts-nocheck
// ArcGIS Maps SDK — 3D SceneView via <arcgis-scene> web component.
// Loads the WebScene you built in ArcGIS Online, then adds the live
// GFW vessel / hotspot layers on top.

import React, { useRef, useEffect } from 'react';

import '@arcgis/map-components/dist/components/arcgis-scene';
import '@arcgis/map-components/dist/components/arcgis-zoom';
import '@arcgis/map-components/dist/components/arcgis-layer-list';
import '@arcgis/map-components/dist/components/arcgis-legend';

import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import esriConfig  from '@arcgis/core/config.js';
import '@arcgis/core/assets/esri/themes/dark/main.css';

import { useAuth } from '@clerk/clerk-react';

// ── Your ArcGIS Online WebScene item ──────────────────────────────────────
// To use this without a login prompt, share the item publicly in ArcGIS Online:
//   Content → (your item) → Share → Everyone (public)
// OR add VITE_ARCGIS_API_KEY= to .env with a key from developers.arcgis.com
const WEBSCENE_ITEM_ID = '0ec389a6ccd94641b60f596fcca389ff';

if (import.meta.env.VITE_ARCGIS_API_KEY) {
  esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
}

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

export default function EsriScene({ onSelectHotspot, onSelectVessel, onDataLoaded, coralVisible }) {
  const sceneRef      = useRef(null);
  const coralLayerRef = useRef(null);
  const { getToken }  = useAuth();

  const onSelectHotspotRef = useRef(onSelectHotspot);
  const onSelectVesselRef  = useRef(onSelectVessel);
  const onDataRef          = useRef(onDataLoaded);
  useEffect(() => { onSelectHotspotRef.current = onSelectHotspot; }, [onSelectHotspot]);
  useEffect(() => { onSelectVesselRef.current  = onSelectVessel;  }, [onSelectVessel]);
  useEffect(() => { onDataRef.current          = onDataLoaded;    }, [onDataLoaded]);

  useEffect(() => {
    if (coralLayerRef.current) coralLayerRef.current.visible = !!coralVisible;
  }, [coralVisible]);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;

    const blobUrls = [];
    let destroyed  = false;
    let vesselLayer, hotspotsLayer;

    const fetchJson = async (url, token) => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { console.warn(`[EsriScene] ${url} → ${res.status}`); return EMPTY_FC; }
        return res.json();
      } catch (err) {
        console.warn(`[EsriScene] ${url} failed:`, err.message);
        return EMPTY_FC;
      }
    };

    const toBlobUrl = (json) => {
      const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      const u = URL.createObjectURL(blob);
      blobUrls.push(u);
      return u;
    };

    const handleViewReady = async () => {
      const view = el.view; // SceneView
      if (!view || destroyed) return;

      // ── Restore the deep-space globe look ─────────────────────────────
      // If a WebScene item-id is loaded these are already set from your scene,
      // but they're safe to apply as overrides too.
      view.environment = {
        background: { type: 'color', color: [6, 11, 25, 1] },
        starsEnabled: true,
        atmosphereEnabled: true,
        atmosphere: { quality: 'high' },
        lighting: { directShadowsEnabled: false, cameraTrackingEnabled: true },
      };

      // Zoom out to full-globe view on load
      view.goTo(
        { position: { longitude: 10, latitude: 15, z: 22_000_000 } },
        { duration: 0 }
      ).catch(() => {});

      view.popup.autoOpenEnabled = false;

      // ── Fetch all data in parallel ─────────────────────────────────────
      const token = await getToken();
      const [vessels, detections, hotspots, coral] = await Promise.all([
        fetchJson('/api/vessels',    token),
        fetchJson('/api/detections', token),
        fetchJson('/api/hotspots',   token),
        fetchJson('/api/coral',      token),
      ]);
      if (destroyed) return;
      onDataRef.current?.({ vessels, detections, hotspots });

      // ── AIS Vessels — ship icon ────────────────────────────────────────
      vesselLayer = new GeoJSONLayer({
        url: toBlobUrl(vessels),
        title: 'AIS Vessels',
        copyright: 'Global Fishing Watch',
        outFields: ['*'],
        renderer: {
          type: 'simple',
          symbol: { type: 'picture-marker', url: '/ship-icon.svg', width: 18, height: 27 },
        },
      });

      // ── SAR Detections ─────────────────────────────────────────────────
      const sarLayer = new GeoJSONLayer({
        url: toBlobUrl(detections),
        title: 'SAR Detections (Sentinel-1)',
        visible: false,
        outFields: ['*'],
        renderer: {
          type: 'unique-value',
          field: 'is_dark',
          uniqueValueInfos: [
            {
              value: true,
              label: 'Dark vessel (no AIS)',
              symbol: { type: 'simple-marker', style: 'x', color: [239, 68, 68, 1], size: 14, outline: { color: [239, 68, 68, 1], width: 2 } },
            },
            {
              value: false,
              label: 'SAR + AIS match',
              symbol: { type: 'simple-marker', style: 'diamond', color: [250, 204, 21, 0.75], size: 7, outline: { color: [250, 204, 21, 0.5], width: 1 } },
            },
          ],
        },
      });

      // ── Illegal Fishing Hotspots ───────────────────────────────────────
      hotspotsLayer = new GeoJSONLayer({
        url: toBlobUrl(hotspots),
        title: 'Illegal Fishing Hotspots',
        outFields: ['*'],
        renderer: {
          type: 'simple',
          symbol: { type: 'simple-marker', style: 'circle', color: [239, 68, 68, 0.2], size: 40, outline: { color: [239, 68, 68, 0.95], width: 2.5 } },
          visualVariables: [
            { type: 'size',  field: 'vessel_count',  stops: [{ value: 3, size: 32 }, { value: 12, size: 80 }] },
            { type: 'color', field: 'density_score', stops: [{ value: 0.3, color: [250, 204, 21, 0.3] }, { value: 1.2, color: [239, 68, 68, 0.4] }] },
          ],
        },
      });

      // ── Coral Reef Health ──────────────────────────────────────────────
      const coralLayer = new GeoJSONLayer({
        url: toBlobUrl(coral),
        title: 'Coral Reef Health',
        visible: !!coralVisible,
        outFields: ['*'],
        renderer: {
          type: 'simple',
          symbol: { type: 'simple-marker', style: 'circle', color: [52, 211, 153, 0.65], size: 10, outline: { color: [52, 211, 153, 0.9], width: 1.5 } },
          visualVariables: [{
            type: 'color', field: 'bleaching_risk',
            stops: [
              { value: 20, color: [52, 211, 153, 0.8] },
              { value: 50, color: [251, 191, 36, 0.85] },
              { value: 80, color: [239, 68, 68, 0.9] },
            ],
          }],
        },
      });
      coralLayerRef.current = coralLayer;

      view.map.addMany([coralLayer, sarLayer, vesselLayer, hotspotsLayer]);

      // ── Click: hotspots priority, then vessels ─────────────────────────
      view.on('click', async (clickEvent) => {
        try {
          const hit = await view.hitTest(clickEvent, { include: [hotspotsLayer, vesselLayer] });

          const hotspotHit = hit.results.find((r) => r.layer === hotspotsLayer && r.graphic);
          if (hotspotHit?.graphic?.attributes) {
            onSelectHotspotRef.current?.(hotspotHit.graphic.attributes);
            const pt = hotspotHit.graphic.geometry;
            if (pt?.longitude != null) {
              view.goTo(
                { target: [pt.longitude, pt.latitude], zoom: 6, tilt: 30 },
                { duration: 1200, easing: 'ease-in-out' }
              ).catch(() => {});
            }
            return;
          }

          const vesselHit = hit.results.find((r) => r.layer === vesselLayer && r.graphic);
          if (vesselHit?.graphic?.attributes) {
            onSelectVesselRef.current?.(vesselHit.graphic.attributes);
          }
        } catch (err) {
          console.error('[EsriScene] hitTest error:', err);
        }
      });
    };

    el.addEventListener('arcgisViewReadyChange', handleViewReady);

    return () => {
      destroyed = true;
      coralLayerRef.current = null;
      el.removeEventListener('arcgisViewReadyChange', handleViewReady);
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [getToken]);

  return (
    <arcgis-scene
      ref={sceneRef}
      item-id={WEBSCENE_ITEM_ID}
      theme="dark"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <arcgis-zoom position="top-left" />
      <arcgis-layer-list position="top-right" />
      <arcgis-legend position="bottom-right" />
    </arcgis-scene>
  );
}

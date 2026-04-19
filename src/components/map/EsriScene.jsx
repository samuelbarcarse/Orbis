// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import esriConfig from '@arcgis/core/config.js';
import Map from '@arcgis/core/Map.js';
import SceneView from '@arcgis/core/views/SceneView.js';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import LayerList from '@arcgis/core/widgets/LayerList.js';
import Legend from '@arcgis/core/widgets/Legend.js';
import Expand from '@arcgis/core/widgets/Expand.js';
import '@arcgis/core/assets/esri/themes/dark/main.css';
import { useAuth } from '@clerk/clerk-react';

if (import.meta.env.VITE_ARCGIS_API_KEY) {
  esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
}

// Returns an empty GeoJSON FeatureCollection used as a safe fallback
const EMPTY_FC = { type: 'FeatureCollection', features: [] };

export default function EsriScene({ onSelectHotspot, onSelectVessel, onDataLoaded, coralVisible }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const coralLayerRef = useRef(null);
  const { getToken } = useAuth();

  const onSelectRef = useRef(onSelectHotspot);
  const onVesselRef = useRef(onSelectVessel);
  const onDataRef = useRef(onDataLoaded);
  useEffect(() => { onSelectRef.current = onSelectHotspot; }, [onSelectHotspot]);
  useEffect(() => { onVesselRef.current = onSelectVessel; }, [onSelectVessel]);
  useEffect(() => { onDataRef.current = onDataLoaded; }, [onDataLoaded]);

  // Toggle coral layer visibility without re-mounting the scene
  useEffect(() => {
    if (coralLayerRef.current) {
      coralLayerRef.current.visible = !!coralVisible;
    }
  }, [coralVisible]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    const blobUrls = [];

    (async () => {
      const token = await getToken();

      // Fetch JSON with auth header; returns fallback on any error so the
      // map still renders even if one endpoint is down or returns an error.
      const fetchJson = async (url, fallback = EMPTY_FC) => {
        try {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) {
            console.warn(`[EsriScene] ${url} → HTTP ${res.status}, using fallback`);
            return fallback;
          }
          return await res.json();
        } catch (err) {
          console.warn(`[EsriScene] ${url} failed (${err.message}), using fallback`);
          return fallback;
        }
      };

      const toBlobUrl = (json) => {
        const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
        const u = URL.createObjectURL(blob);
        blobUrls.push(u);
        return u;
      };

      // Fetch all layers in parallel; individual failures use empty GeoJSON
      const [vessels, detections, hotspots, coral] = await Promise.all([
        fetchJson('/api/vessels'),
        fetchJson('/api/detections'),
        fetchJson('/api/hotspots'),
        fetchJson('/api/coral'),
      ]);

      if (destroyed) return;
      onDataRef.current?.({ vessels, detections, hotspots });

      // ─── Build the ArcGIS scene ────────────────────────────────────────────

      const map = new Map({ basemap: 'dark-gray-vector' });

      const view = new SceneView({
        container: containerRef.current,
        map,
        viewingMode: 'global',
        camera: {
          position: { longitude: 10, latitude: 15, z: 22_000_000 },
          tilt: 0,
          heading: 0,
        },
        environment: {
          background: { type: 'color', color: [6, 11, 25, 1] },
          starsEnabled: true,
          atmosphereEnabled: true,
          atmosphere: { quality: 'high' },
          lighting: { directShadowsEnabled: false, cameraTrackingEnabled: true },
        },
        ui: { components: ['compass', 'zoom'] },
      });
      viewRef.current = view;

      // Disable ArcGIS native popup — we handle clicks with our own panels
      view.popup.autoOpenEnabled = false;

      // ═══ AIS VESSELS — ship icon picture markers ═══
      const vesselsLayer = new GeoJSONLayer({
        url: toBlobUrl(vessels),
        title: 'AIS Vessels',
        copyright: 'Global Fishing Watch',
        outFields: ['*'],
        renderer: {
          type: 'simple',
          symbol: {
            type: 'picture-marker',
            // ship-icon.svg lives in /public and is served at the root path
            url: '/ship-icon.svg',
            width: 18,
            height: 27,
          },
        },
      });

      // ═══ SAR DETECTIONS ═══
      const sarLayer = new GeoJSONLayer({
        url: toBlobUrl(detections),
        title: 'SAR Detections (Sentinel-1)',
        visible: false,
        copyright: 'Sentinel-1 C-band SAR',
        outFields: ['*'],
        renderer: {
          type: 'unique-value',
          field: 'is_dark',
          uniqueValueInfos: [
            {
              value: true,
              label: 'Dark vessel (no AIS match)',
              symbol: {
                type: 'simple-marker',
                style: 'x',
                color: [239, 68, 68, 1],
                size: 14,
                outline: { color: [239, 68, 68, 1], width: 2 },
              },
            },
            {
              value: false,
              label: 'SAR + AIS match',
              symbol: {
                type: 'simple-marker',
                style: 'diamond',
                color: [250, 204, 21, 0.75],
                size: 7,
                outline: { color: [250, 204, 21, 0.5], width: 1 },
              },
            },
          ],
        },
      });

      // ═══ ILLEGAL FISHING HOTSPOTS ═══
      const hotspotsLayer = new GeoJSONLayer({
        url: toBlobUrl(hotspots),
        title: 'Illegal Fishing Hotspots',
        copyright: 'Orbis DBSCAN clustering',
        outFields: ['*'],
        renderer: {
          type: 'simple',
          symbol: {
            type: 'simple-marker',
            style: 'circle',
            color: [239, 68, 68, 0.2],
            size: 40,
            outline: { color: [239, 68, 68, 0.95], width: 2.5 },
          },
          visualVariables: [
            {
              type: 'size',
              field: 'vessel_count',
              stops: [
                { value: 3, size: 32 },
                { value: 12, size: 80 },
              ],
            },
            {
              type: 'color',
              field: 'density_score',
              stops: [
                { value: 0.3, color: [250, 204, 21, 0.3] },
                { value: 1.2, color: [239, 68, 68, 0.4] },
              ],
            },
          ],
        },
      });

      // ═══ CORAL REEF HEALTH ═══
      const coralLayer = new GeoJSONLayer({
        url: toBlobUrl(coral),
        title: 'Coral Reef Health',
        visible: !!coralVisible,
        copyright: 'NOAA CRCP (simulated)',
        outFields: ['*'],
        renderer: {
          type: 'simple',
          symbol: {
            type: 'simple-marker',
            style: 'circle',
            color: [52, 211, 153, 0.65],
            size: 10,
            outline: { color: [52, 211, 153, 0.9], width: 1.5 },
          },
          visualVariables: [
            {
              type: 'color',
              field: 'bleaching_risk',
              stops: [
                { value: 20, color: [52, 211, 153, 0.8] },
                { value: 50, color: [251, 191, 36, 0.85] },
                { value: 80, color: [239, 68, 68, 0.9] },
              ],
            },
          ],
        },
        popupTemplate: {
          title: '🪸 {reef_name}',
          content: [{
            type: 'fields',
            fieldInfos: [
              { fieldName: 'health_score', label: 'Health Score (0–100)' },
              { fieldName: 'bleaching_risk', label: 'Bleaching Risk (%)' },
              { fieldName: 'temperature_anomaly', label: 'Temp Anomaly (°C)' },
            ],
          }],
        },
      });
      coralLayerRef.current = coralLayer;

      map.addMany([coralLayer, sarLayer, vesselsLayer, hotspotsLayer]);

      const layerList = new LayerList({ view });
      view.ui.add(
        new Expand({ view, content: layerList, expandIcon: 'layers', expandTooltip: 'Layers', group: 'top-right' }),
        'top-right'
      );
      view.ui.add(
        new Expand({ view, content: new Legend({ view }), expandIcon: 'legend', expandTooltip: 'Legend', group: 'top-right' }),
        'top-right'
      );

      // Click handler: hotspots take priority, then individual vessels
      view.on('click', async (event) => {
        try {
          const response = await view.hitTest(event, { include: [hotspotsLayer, vesselsLayer] });

          // ── Hotspot hit ──────────────────────────────────────────────────
          const hotspotHit = response.results.find(
            (r) => r.layer === hotspotsLayer && r.graphic
          );
          if (hotspotHit?.graphic?.attributes) {
            onSelectRef.current?.(hotspotHit.graphic.attributes);
            const pt = hotspotHit.graphic.geometry;
            if (pt?.longitude != null) {
              view.goTo(
                { target: [pt.longitude, pt.latitude], zoom: 6, tilt: 30 },
                { duration: 1200, easing: 'ease-in-out' }
              ).catch(() => {});
            }
            return; // don't also open vessel panel
          }

          // ── Vessel hit ───────────────────────────────────────────────────
          const vesselHit = response.results.find(
            (r) => r.layer === vesselsLayer && r.graphic
          );
          if (vesselHit?.graphic?.attributes) {
            onVesselRef.current?.(vesselHit.graphic.attributes);
          }
        } catch (err) {
          console.error('[EsriScene] hitTest error:', err);
        }
      });
    })();

    return () => {
      destroyed = true;
      coralLayerRef.current = null;
      if (viewRef.current) {
        try { viewRef.current.destroy(); } catch {}
        viewRef.current = null;
      }
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [getToken]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

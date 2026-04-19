// @ts-nocheck
// 3D Esri ArcGIS SceneView with AIS / SAR / Hotspot FeatureLayers.
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

export default function EsriScene({ onSelectHotspot, onDataLoaded }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const { getToken } = useAuth();

  const onSelectRef = useRef(onSelectHotspot);
  const onDataRef = useRef(onDataLoaded);
  useEffect(() => { onSelectRef.current = onSelectHotspot; }, [onSelectHotspot]);
  useEffect(() => { onDataRef.current = onDataLoaded; }, [onDataLoaded]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    const blobUrls = [];

    (async () => {
      const token = await getToken();

      const fetchJson = async (url) => {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        return res.json();
      };

      const toBlobUrl = (json) => {
        const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
        const u = URL.createObjectURL(blob);
        blobUrls.push(u);
        return u;
      };

      let vessels, detections, hotspots;
      try {
        [vessels, detections, hotspots] = await Promise.all([
          fetchJson('/api/vessels'),
          fetchJson('/api/detections'),
          fetchJson('/api/hotspots'),
        ]);
      } catch (err) {
        console.error('[EsriScene] Failed to load data:', err);
        return;
      }

      if (destroyed) return;
      onDataRef.current?.({ vessels, detections, hotspots });

      const vesselsUrl = toBlobUrl(vessels);
      const sarUrl = toBlobUrl(detections);
      const hotspotsUrl = toBlobUrl(hotspots);

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

      // ═══ AIS VESSELS LAYER ═══
      const vesselsLayer = new GeoJSONLayer({
        url: vesselsUrl,
        title: 'AIS Vessels',
        copyright: 'Global Fishing Watch (simulated)',
        outFields: ['*'],
        renderer: {
          type: 'simple',
          symbol: {
            type: 'simple-marker',
            color: [56, 189, 248, 0.85],
            size: 5,
            outline: { color: [56, 189, 248, 0.25], width: 3 },
          },
        },
        popupTemplate: {
          title: '🚢 {name}',
          content: [{
            type: 'fields',
            fieldInfos: [
              { fieldName: 'mmsi', label: 'MMSI' },
              { fieldName: 'flag', label: 'Flag' },
              { fieldName: 'type', label: 'Type' },
              { fieldName: 'speed_knots', label: 'Speed (kn)' },
              { fieldName: 'course_deg', label: 'Course (°)' },
              { fieldName: 'timestamp', label: 'Last Signal' },
            ],
          }],
        },
      });

      // ═══ SAR DETECTIONS LAYER ═══
      const sarLayer = new GeoJSONLayer({
        url: sarUrl,
        title: 'SAR Detections (Sentinel-1)',
        visible: false,
        copyright: 'Sentinel-1 C-band SAR (simulated)',
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
        popupTemplate: {
          title: '📡 Sentinel-1 SAR Detection',
          content: [{
            type: 'fields',
            fieldInfos: [
              { fieldName: 'is_dark', label: 'Dark Vessel' },
              { fieldName: 'confidence', label: 'Confidence' },
              { fieldName: 'matched_vessel_mmsi', label: 'Matched MMSI' },
              { fieldName: 'timestamp', label: 'Detection Time' },
            ],
          }],
        },
      });

      // ═══ HOTSPOTS LAYER (DBSCAN) ═══
      const hotspotsLayer = new GeoJSONLayer({
        url: hotspotsUrl,
        title: 'Illegal Fishing Hotspots',
        copyright: 'Orbis DBSCAN clustering',
        outFields: ['*'],
        renderer: {
          type: 'simple',
          symbol: {
            type: 'simple-marker',
            style: 'circle',
            color: [239, 68, 68, 0.25],
            size: 40,
            outline: { color: [239, 68, 68, 0.95], width: 2.5 },
          },
          visualVariables: [
            {
              type: 'size',
              field: 'vessel_count',
              stops: [
                { value: 3, size: 30 },
                { value: 12, size: 90 },
              ],
            },
            {
              type: 'color',
              field: 'density_score',
              stops: [
                { value: 0.3, color: [250, 204, 21, 0.35] },
                { value: 1.2, color: [239, 68, 68, 0.45] },
              ],
            },
          ],
        },
        popupTemplate: {
          title: '⚠ Illegal Fishing Hotspot — {vessel_count} dark vessels',
          content: [{
            type: 'fields',
            fieldInfos: [
              { fieldName: 'severity', label: 'Severity' },
              { fieldName: 'density_score', label: 'Density Score' },
              { fieldName: 'avg_confidence', label: 'Avg SAR Confidence' },
              { fieldName: 'nearest_mpa', label: 'Nearest MPA' },
              { fieldName: 'proximity_to_mpa_km', label: 'Distance to MPA (km)' },
              { fieldName: 'proximity_to_coast_km', label: 'Distance to Coast (km)' },
              { fieldName: 'in_mpa', label: 'Inside MPA' },
            ],
          }],
        },
      });

      map.addMany([vesselsLayer, sarLayer, hotspotsLayer]);

      // LayerList widget (collapsible, top-right)
      const layerList = new LayerList({ view });
      const layerListExpand = new Expand({
        view,
        content: layerList,
        expandIcon: 'layers',
        expandTooltip: 'Toggle Layers',
        group: 'top-right',
      });
      view.ui.add(layerListExpand, 'top-right');

      const legend = new Legend({ view });
      const legendExpand = new Expand({
        view,
        content: legend,
        expandIcon: 'legend',
        expandTooltip: 'Legend',
        group: 'top-right',
      });
      view.ui.add(legendExpand, 'top-right');

      // Hotspot click → sync with side panel
      view.on('click', async (event) => {
        try {
          const response = await view.hitTest(event, { include: [hotspotsLayer] });
          const first = response.results.find((r) => r.graphic);
          if (first?.graphic?.attributes) {
            onSelectRef.current?.(first.graphic.attributes);
            const pt = first.graphic.geometry;
            if (pt?.longitude != null) {
              view.goTo(
                { target: [pt.longitude, pt.latitude], zoom: 6, tilt: 30 },
                { duration: 1200, easing: 'ease-in-out' }
              ).catch(() => {});
            }
          }
        } catch (err) {
          console.error('[EsriScene] hitTest error:', err);
        }
      });
    })();

    return () => {
      destroyed = true;
      if (viewRef.current) {
        try { viewRef.current.destroy(); } catch {}
        viewRef.current = null;
      }
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [getToken]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

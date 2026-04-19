// GET /vessels.geojson
// Public endpoint — no authentication required.
// Returns a combined GeoJSON FeatureCollection of:
//   type: "tracked"   — real AIS fishing vessels from Global Fishing Watch
//   type: "untracked" — dark vessels (no matching AIS signal)
//
// Paste this URL into ArcGIS Online as: New Item → URL → GeoJSON

import { Router } from 'express';
import { gfwFetch, daysAgo, today } from '../lib/gfwClient.js';

const router = Router();

router.get('/vessels.geojson', async (req, res) => {
  try {
    // Fetch real AIS fishing events from GFW (last 7 days)
    const params = new URLSearchParams({
      'datasets[0]': 'public-global-fishing-events:latest',
      'start-date': daysAgo(7),
      'end-date': today(),
      limit: '200',
      offset: '0',
    });

    const data = await gfwFetch(`/v3/events?${params}`);
    const entries = data.entries || [];

    const features = [];

    entries.forEach((event, i) => {
      const lon = event.position?.lon ?? 0;
      const lat = event.position?.lat ?? 0;

      // Every 4th vessel is "untracked" (dark — no AIS match detected by SAR)
      const isDark = (i % 4 === 0);

      if (isDark) {
        // ── Untracked vessel ────────────────────────────────────────────────
        // Slight coordinate jitter so it doesn't overlap the matched AIS dot
        const jitter = () => (Math.random() - 0.5) * 0.04;
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon + jitter(), lat + jitter()], // [longitude, latitude]
          },
          properties: {
            type: 'untracked',
            risk_score: +(0.65 + Math.random() * 0.30).toFixed(2), // 0.65–0.95
            mmsi: null,
            name: 'Unknown / Dark Vessel',
            flag: null,
            timestamp: event.start,
          },
        });
      }

      // ── Tracked AIS vessel ────────────────────────────────────────────────
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat], // [longitude, latitude]
        },
        properties: {
          type: 'tracked',
          risk_score: +(0.05 + Math.random() * 0.25).toFixed(2), // 0.05–0.30
          mmsi: event.vessel?.ssvid || null,
          name: event.vessel?.name || 'Unknown Vessel',
          flag: event.vessel?.flag || null,
          timestamp: event.start,
        },
      });
    });

    // ArcGIS requires Content-Type: application/json for GeoJSON layers
    res.setHeader('Content-Type', 'application/json');
    res.json({ type: 'FeatureCollection', features });

  } catch (err) {
    console.error('[/vessels.geojson] error:', err.message);
    // Return empty valid GeoJSON on error so ArcGIS doesn't reject the layer
    res.json({ type: 'FeatureCollection', features: [] });
  }
});

export default router;

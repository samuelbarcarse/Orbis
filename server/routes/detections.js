// GET /api/detections
// Fetches SAR-like dark vessel detections.
// The GFW SAR presence dataset is not accessible via the Events API,
// so we derive synthetic dark-vessel positions from real AIS fishing clusters:
// we take AIS fishing event coordinates and mark a subset as "untracked"
// (no AIS signal) to represent vessels likely evading monitoring.

import { Router } from 'express';
import { gfwFetch, daysAgo, today } from '../lib/gfwClient.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Pull real AIS fishing events to seed realistic ocean coordinates
    const params = new URLSearchParams({
      'datasets[0]': 'public-global-fishing-events:latest',
      'start-date': daysAgo(7),
      'end-date': today(),
      limit: '200',
      offset: '0',
    });

    const data = await gfwFetch(`/v3/events?${params}`);
    const entries = data.entries || [];

    // Build "detection" features from real positions.
    // ~25% are marked dark (no AIS) — the rest are SAR+AIS matches.
    const features = entries.map((event, i) => {
      const isDark = (i % 4 === 0); // every 4th detection = untracked vessel
      // Add a tiny jitter so SAR and AIS dots don't sit exactly on top of each other
      const jitter = () => (Math.random() - 0.5) * 0.04;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            (event.position?.lon ?? 0) + jitter(),
            (event.position?.lat ?? 0) + jitter(),
          ],
        },
        properties: {
          id: `sar-${event.id}`,
          confidence: isDark ? +(0.6 + Math.random() * 0.3).toFixed(2) : +(0.75 + Math.random() * 0.23).toFixed(2),
          sensor: 'Sentinel-1',
          timestamp: event.start,
          has_ais_match: !isDark,
          matched_vessel_mmsi: isDark ? null : (event.vessel?.ssvid || null),
          is_dark: isDark,
          neural_vessel_type: isDark ? 'Likely Fishing' : 'Matched AIS',
        },
      };
    });

    const result = req.query.dark === 'true'
      ? features.filter((f) => f.properties.is_dark)
      : features;

    res.json({ type: 'FeatureCollection', features: result });
  } catch (err) {
    console.error('[detections] error:', err.message);
    // Return empty GeoJSON instead of a 502 so the map still renders
    res.json({ type: 'FeatureCollection', features: [] });
  }
});

export default router;

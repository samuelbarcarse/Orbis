// GET /api/vessels        — all AIS vessel positions as GeoJSON
// GET /api/vessels/info   — vessel identity detail from GFW (?mmsi=...)

import { Router } from 'express';
import { gfwFetch, daysAgo, today } from '../lib/gfwClient.js';

const router = Router();

// ── Vessel list ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const params = new URLSearchParams({
      'datasets[0]': 'public-global-fishing-events:latest',
      'start-date': daysAgo(7),
      'end-date': today(),
      limit: '200',
      offset: '0',
    });

    const data = await gfwFetch(`/v3/events?${params}`);

    const features = (data.entries || []).map((event) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [event.position?.lon ?? 0, event.position?.lat ?? 0],
      },
      properties: {
        id: event.id,
        // vessel_gfw_id lets the frontend call /api/vessels/info?mmsi=...
        vessel_gfw_id: event.vessel?.id || null,
        mmsi: event.vessel?.ssvid || null,
        name: event.vessel?.name || 'Unknown Vessel',
        type: 'fishing',
        flag: event.vessel?.flag || null,
        speed_knots: event.fishing?.averageSpeedKnots ?? 0,
        course_deg: 0,
        timestamp: event.start,
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('[vessels] GFW error:', err.message);
    res.json({ type: 'FeatureCollection', features: [] });
  }
});

// ── Vessel identity detail ─────────────────────────────────────────────────
// GET /api/vessels/info?mmsi=412419196
// Returns richer vessel metadata from the GFW vessel identity dataset.
// Responds with null (not a 4xx) when nothing is found so the frontend
// can render a "Not found" state instead of an error.
router.get('/info', async (req, res) => {
  const { mmsi } = req.query;
  if (!mmsi) return res.status(400).json({ error: 'mmsi query param required' });

  try {
    const params = new URLSearchParams({
      'datasets[0]': 'public-global-vessel-identity:latest',
      query: mmsi,
      limit: '1',
    });
    const data = await gfwFetch(`/v3/vessels/search?${params}`);
    const entry = data.entries?.[0] || null;

    if (!entry) return res.json(null);

    // Pull the most useful fields into a flat object
    const registry = entry.registryInfo?.[0] || {};
    const self     = entry.selfReportedInfo?.[0] || {};
    const combined = entry.combinedSourcesInfo?.[0] || {};

    res.json({
      imo:        registry.imo      || self.imo      || null,
      callsign:   registry.callsign || self.callsign || null,
      shipname:   registry.shipname || self.shipname || null,
      flag:       registry.flag     || self.flag     || null,
      geartype:   combined.geartypes?.[0]?.name  || null,
      shiptype:   combined.shiptypes?.[0]?.name  || null,
      owner:      entry.registryOwners?.[0]?.name || null,
      first_seen: self.transmissionDateFrom || null,
      last_seen:  self.transmissionDateTo   || null,
    });
  } catch (err) {
    console.error('[vessels/info] GFW error:', err.message);
    res.json(null); // frontend shows "Not found"
  }
});

export default router;

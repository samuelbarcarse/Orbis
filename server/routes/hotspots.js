// GET /api/hotspots
// Fetches real AIS fishing events from GFW, runs DBSCAN to find dense fishing
// clusters, then scores each cluster for severity and MPA proximity.
//
// GET /api/hotspots/:id  — detail for a single cluster (from in-memory cache)

import { Router } from 'express';
import DensityClustering from 'density-clustering';
import { gfwFetch, daysAgo, today } from '../lib/gfwClient.js';

const { DBSCAN } = DensityClustering;
const router = Router();

// ─── Reference data ────────────────────────────────────────────────────────
const MPAs = [
  { name: 'Papahānaumokuākea MPA', lat: 25.4, lng: -168.0 },
  { name: 'Galápagos Marine Reserve', lat: -0.5, lng: -90.5 },
  { name: 'Great Barrier Reef MPA', lat: -18.3, lng: 147.7 },
  { name: 'Phoenix Islands Protected Area', lat: -3.5, lng: -172.0 },
  { name: 'Ross Sea Region MPA', lat: -76.0, lng: 175.0 },
  { name: 'Chagos Marine Reserve', lat: -6.5, lng: 71.5 },
  { name: 'Revillagigedo Archipelago', lat: 19.0, lng: -111.0 },
  { name: 'Coral Sea MPA', lat: -18.0, lng: 150.0 },
];

const COASTAL_POINTS = [
  { lng: -10, lat: 5 }, { lng: 115, lat: 14 }, { lng: -88, lat: -4 },
  { lng: -60, lat: -46 }, { lng: 72, lat: -8 }, { lng: 25, lat: -34 },
  { lng: 142, lat: 35 }, { lng: -75, lat: 38 }, { lng: 10, lat: 53 },
  { lng: -120, lat: 35 }, { lng: 145, lat: -25 }, { lng: -43, lat: -23 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearest(point, list) {
  let best = null;
  let bestDist = Infinity;
  for (const p of list) {
    const d = haversineKm(point.lat, point.lng, p.lat, p.lng);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return { point: best, distanceKm: bestDist };
}

// ─── In-memory cache (10-minute TTL) ────────────────────────────────────────
let _cache = { hotspots: [], byId: {}, ts: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000;

async function getOrComputeHotspots() {
  if (Date.now() - _cache.ts < CACHE_TTL_MS) return _cache;

  // 1. Fetch real AIS fishing events from GFW (last 7 days, up to 200)
  const params = new URLSearchParams({
    'datasets[0]': 'public-global-fishing-events:latest',
    'start-date': daysAgo(7),
    'end-date': today(),
    limit: '200',
    offset: '0',
  });
  const data = await gfwFetch(`/v3/events?${params}`);

  const points = (data.entries || []).map((e) => ({
    lat: e.position?.lat ?? 0,
    lng: e.position?.lon ?? 0,
    timestamp: e.start,
    vesselName: e.vessel?.name || 'Unknown',
    mmsi: e.vessel?.ssvid || null,
  }));

  // 2. DBSCAN: eps=2.0° (~220 km), minPts=3
  //    Larger eps than seed.js because AIS events are more spread out
  const coords = points.map((p) => [p.lng, p.lat]);
  const clusters = new DBSCAN().run(coords, 2.0, 3);

  // 3. Build hotspot objects from each cluster
  const hotspots = clusters.map((indices, idx) => {
    const members = indices.map((i) => points[i]);
    const centerLat = members.reduce((s, m) => s + m.lat, 0) / members.length;
    const centerLng = members.reduce((s, m) => s + m.lng, 0) / members.length;

    const timestamps = members
      .map((m) => m.timestamp)
      .filter(Boolean)
      .map((t) => new Date(t).getTime());
    const from = timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null;
    const to   = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

    const distances = members.map((m) => haversineKm(centerLat, centerLng, m.lat, m.lng));
    const avgRadiusKm = distances.reduce((s, d) => s + d, 0) / distances.length || 1;
    const density_score = +(members.length / Math.max(avgRadiusKm, 5)).toFixed(2);

    const nearMpa   = nearest({ lat: centerLat, lng: centerLng }, MPAs);
    const nearCoast = nearest({ lat: centerLat, lng: centerLng }, COASTAL_POINTS);

    const severity =
      members.length >= 10 || nearMpa.distanceKm < 150 ? 'high'
      : members.length >= 6 ? 'medium'
      : 'low';

    return {
      id: String(idx),
      center: { lat: +centerLat.toFixed(4), lng: +centerLng.toFixed(4) },
      vessel_count: members.length,
      density_score,
      time_range: { from, to },
      proximity_to_coast_km: Math.round(nearCoast.distanceKm),
      proximity_to_mpa_km: Math.round(nearMpa.distanceKm),
      nearest_mpa: nearMpa.point?.name || null,
      in_mpa: nearMpa.distanceKm < 100,
      avg_confidence: 0.85, // GFW AIS data is high-confidence by nature
      severity,
      radius_km: Math.max(8, members.length * 4),
      detections: members.map((m) => ({
        latitude: m.lat,
        longitude: m.lng,
        timestamp: m.timestamp,
        confidence: 0.85,
      })),
    };
  });

  const byId = Object.fromEntries(hotspots.map((h) => [h.id, h]));
  _cache = { hotspots, byId, ts: Date.now() };
  console.log(`[hotspots] Computed ${hotspots.length} clusters from ${points.length} AIS events`);
  return _cache;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { hotspots } = await getOrComputeHotspots();

    const features = hotspots.map((h) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.center.lng, h.center.lat] },
      properties: {
        id: h.id,
        latitude: h.center.lat,
        longitude: h.center.lng,
        radius_km: h.radius_km,
        vessel_count: h.vessel_count,
        density_score: h.density_score,
        severity: h.severity,
        in_mpa: h.in_mpa,
        nearest_mpa: h.nearest_mpa,
        proximity_to_coast_km: h.proximity_to_coast_km,
        proximity_to_mpa_km: h.proximity_to_mpa_km,
        avg_confidence: h.avg_confidence,
        time_from: h.time_range?.from,
        time_to: h.time_range?.to,
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('[hotspots] error:', err.message);
    res.json({ type: 'FeatureCollection', features: [] });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { byId } = await getOrComputeHotspots();
    const hotspot = byId[req.params.id];
    if (!hotspot) return res.status(404).json({ error: 'Not found' });
    res.json(hotspot);
  } catch (err) {
    console.error('[hotspots/:id] error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

export default router;

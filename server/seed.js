// Simulated AIS + Sentinel-1 SAR data generator with DBSCAN hotspot clustering.
// Run via `npm run seed`, or automatically on API boot if collections are empty.

import DensityClustering from 'density-clustering';
import { getCollection } from './db.js';

const { DBSCAN } = DensityClustering;

// Known illegal-fishing hotspot regions (approximate centers)
const HOTSPOT_REGIONS = [
  { name: 'West Africa Coast', lat: 5, lng: -10, spread: 3.5 },
  { name: 'South China Sea', lat: 14, lng: 115, spread: 4 },
  { name: 'East Pacific', lat: -4, lng: -88, spread: 3 },
  { name: 'Patagonian Shelf', lat: -46, lng: -60, spread: 3 },
  { name: 'Indian Ocean Rim', lat: -8, lng: 72, spread: 3 },
];

// Marine Protected Areas (well-known reference points)
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

// Approximate coastal anchor points for proximity-to-coast metric
const COASTAL_POINTS = [
  { lng: -10, lat: 5 }, { lng: 115, lat: 14 }, { lng: -88, lat: -4 },
  { lng: -60, lat: -46 }, { lng: 72, lat: -8 }, { lng: 25, lat: -34 },
  { lng: 142, lat: 35 }, { lng: -75, lat: 38 }, { lng: 10, lat: 53 },
  { lng: -120, lat: 35 }, { lng: 145, lat: -25 }, { lng: -43, lat: -23 },
];

// Vessel name/flag pools
const FLAGS = ['CN', 'TW', 'KR', 'JP', 'ES', 'PA', 'LR', 'MT', 'BZ', 'RU', 'ID', 'PE', 'US', 'NO', 'UN'];
const VESSEL_PREFIXES = ['Sea', 'Ocean', 'Star', 'Blue', 'Iron', 'Northern', 'Pacific', 'Atlantic', 'Silver', 'Golden'];
const VESSEL_SUFFIXES = ['Harvester', 'Voyager', 'Pride', 'Hunter', 'Queen', 'Spirit', 'Trader', 'Pioneer', 'Endeavor', 'Falcon'];

const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return { point: best, distanceKm: bestDist };
}

function generateVessels(count) {
  const vessels = [];
  for (let i = 0; i < count; i++) {
    // 70% of vessels cluster near a hotspot region, 30% scattered globally
    let lat, lng;
    if (Math.random() < 0.7) {
      const region = pick(HOTSPOT_REGIONS);
      lat = region.lat + rand(-region.spread, region.spread);
      lng = region.lng + rand(-region.spread, region.spread);
    } else {
      lat = rand(-60, 60);
      lng = rand(-180, 180);
    }
    const name = `${pick(VESSEL_PREFIXES)} ${pick(VESSEL_SUFFIXES)}`;
    const mmsi = String(200000000 + Math.floor(Math.random() * 700000000));
    vessels.push({
      mmsi,
      name,
      type: Math.random() < 0.85 ? 'fishing' : 'cargo',
      flag: pick(FLAGS),
      last_position: {
        lat: +lat.toFixed(4),
        lng: +lng.toFixed(4),
        timestamp: new Date(Date.now() - rand(0, 24 * 3600 * 1000)).toISOString(),
        speed_knots: +rand(0, 14).toFixed(1),
        course_deg: Math.floor(rand(0, 360)),
      },
    });
  }
  return vessels;
}

function generateSarDetections(vessels, darkCount) {
  const detections = [];

  // Matched detections: close to a real vessel (within 0.5 km + 45 min)
  const matchedCount = 55;
  for (let i = 0; i < matchedCount; i++) {
    const v = pick(vessels);
    const jitterLat = rand(-0.005, 0.005);
    const jitterLng = rand(-0.005, 0.005);
    detections.push({
      latitude: +(v.last_position.lat + jitterLat).toFixed(4),
      longitude: +(v.last_position.lng + jitterLng).toFixed(4),
      timestamp: new Date(Date.now() - rand(0, 6 * 3600 * 1000)).toISOString(),
      confidence: +rand(0.75, 0.98).toFixed(2),
      sensor: 'Sentinel-1',
      has_ais_match: true,
      matched_vessel_mmsi: v.mmsi,
    });
  }

  // Dark vessels: SAR detections with NO matching AIS — clustered in hotspot regions
  for (let i = 0; i < darkCount; i++) {
    // Strongly cluster dark vessels into 2-3 hotspots for clean DBSCAN output
    const hotspot = HOTSPOT_REGIONS[i % 3];
    const lat = hotspot.lat + rand(-1.2, 1.2);
    const lng = hotspot.lng + rand(-1.2, 1.2);
    detections.push({
      latitude: +lat.toFixed(4),
      longitude: +lng.toFixed(4),
      timestamp: new Date(Date.now() - rand(0, 24 * 3600 * 1000)).toISOString(),
      confidence: +rand(0.6, 0.9).toFixed(2),
      sensor: 'Sentinel-1',
      has_ais_match: false,
      matched_vessel_mmsi: null,
    });
  }

  return detections;
}

function clusterDarkVessels(detections) {
  const dark = detections.filter((d) => !d.has_ais_match);
  if (dark.length === 0) return [];

  // DBSCAN with degree-based epsilon (~1.5 degrees ≈ 165km spatial clustering)
  const points = dark.map((d) => [d.longitude, d.latitude]);
  const dbscan = new DBSCAN();
  const clusters = dbscan.run(points, 1.5, 3); // eps=1.5°, minPts=3

  const hotspots = [];
  for (const cluster of clusters) {
    const members = cluster.map((idx) => dark[idx]);
    const centerLat = members.reduce((s, m) => s + m.latitude, 0) / members.length;
    const centerLng = members.reduce((s, m) => s + m.longitude, 0) / members.length;

    // Time range
    const timestamps = members.map((m) => new Date(m.timestamp).getTime());
    const from = new Date(Math.min(...timestamps)).toISOString();
    const to = new Date(Math.max(...timestamps)).toISOString();

    // Density score: members per steradian (simple heuristic)
    const distances = members.map((m) =>
      haversineKm(centerLat, centerLng, m.latitude, m.longitude)
    );
    const avgRadiusKm = distances.reduce((s, d) => s + d, 0) / distances.length || 1;
    const density_score = +(members.length / Math.max(avgRadiusKm, 5)).toFixed(2);

    // Spatial analysis
    const nearMpa = nearest({ lat: centerLat, lng: centerLng }, MPAs);
    const nearCoast = nearest({ lat: centerLat, lng: centerLng }, COASTAL_POINTS);

    const severity =
      members.length >= 7 || nearMpa.distanceKm < 150
        ? 'high'
        : members.length >= 5
        ? 'medium'
        : 'low';

    hotspots.push({
      center: { lat: +centerLat.toFixed(4), lng: +centerLng.toFixed(4) },
      vessel_count: members.length,
      density_score,
      time_range: { from, to },
      proximity_to_coast_km: Math.round(nearCoast.distanceKm),
      proximity_to_mpa_km: Math.round(nearMpa.distanceKm),
      nearest_mpa: nearMpa.point?.name || null,
      in_mpa: nearMpa.distanceKm < 100,
      avg_confidence: +(
        members.reduce((s, m) => s + m.confidence, 0) / members.length
      ).toFixed(2),
      severity,
      detections: members.map((m) => ({
        latitude: m.latitude,
        longitude: m.longitude,
        timestamp: m.timestamp,
        confidence: m.confidence,
      })),
    });
  }

  return hotspots;
}

export async function seedDatabase({ force = false } = {}) {
  const vesselsCol = getCollection('vessels');
  const sarCol = getCollection('sar_detections');
  const hotspotsCol = getCollection('hotspots');

  const existing = await vesselsCol.countDocuments({});
  if (existing > 0 && !force) {
    console.log(`[seed] Skipping — ${existing} vessels already present (use force: true to override).`);
    return { skipped: true };
  }

  if (force) {
    await Promise.all([
      vesselsCol.deleteMany({}),
      sarCol.deleteMany({}),
      hotspotsCol.deleteMany({}),
    ]);
    console.log('[seed] Cleared existing collections');
  }

  console.log('[seed] Generating vessels…');
  const vessels = generateVessels(120);

  console.log('[seed] Generating Sentinel-1 SAR detections…');
  const detections = generateSarDetections(vessels, 18);

  console.log('[seed] Running DBSCAN on dark-vessel detections…');
  const hotspots = clusterDarkVessels(detections);

  await vesselsCol.insertMany(vessels);
  await sarCol.insertMany(detections);
  if (hotspots.length > 0) await hotspotsCol.insertMany(hotspots);

  console.log(
    `[seed] Done — ${vessels.length} vessels, ${detections.length} SAR detections (${detections.filter((d) => !d.has_ais_match).length} dark), ${hotspots.length} hotspots.`
  );
  return { vessels: vessels.length, detections: detections.length, hotspots: hotspots.length };
}

// Allow running directly: `node --env-file=server/.env server/seed.js`
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const { connectDB } = await import('./db.js');
  await connectDB();
  await seedDatabase({ force: process.argv.includes('--force') });
  process.exit(0);
}

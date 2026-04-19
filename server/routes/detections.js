import { Router } from 'express';
import { getCollection } from '../db.js';

const router = Router();

// GET /api/detections — SAR detections as GeoJSON. Optional ?dark=true for dark vessels only.
router.get('/', async (req, res) => {
  try {
    const filter = req.query.dark === 'true' ? { has_ais_match: false } : {};
    const detections = await getCollection('sar_detections').find(filter).toArray();
    const features = detections.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.longitude, d.latitude] },
      properties: {
        id: String(d._id),
        confidence: d.confidence,
        sensor: d.sensor,
        timestamp: d.timestamp,
        has_ais_match: d.has_ais_match,
        matched_vessel_mmsi: d.matched_vessel_mmsi,
        is_dark: !d.has_ais_match,
      },
    }));
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

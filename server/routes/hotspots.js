import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getCollection } from '../db.js';

const router = Router();

// GET /api/hotspots — DBSCAN clusters of dark vessels as GeoJSON FeatureCollection
router.get('/', async (req, res) => {
  try {
    const hotspots = await getCollection('hotspots').find({}).toArray();
    const features = hotspots.map((h) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.center.lng, h.center.lat] },
      properties: {
        id: String(h._id),
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hotspots/:id — single hotspot with detection detail
router.get('/:id', async (req, res) => {
  try {
    const hotspot = await getCollection('hotspots').findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!hotspot) return res.status(404).json({ error: 'Not found' });
    res.json(hotspot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

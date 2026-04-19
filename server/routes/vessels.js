import { Router } from 'express';
import { getCollection } from '../db.js';

const router = Router();

// GET /api/vessels — AIS vessel positions as GeoJSON FeatureCollection
router.get('/', async (req, res) => {
  try {
    const vessels = await getCollection('vessels').find({}).toArray();
    const features = vessels.map((v) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [v.last_position.lng, v.last_position.lat],
      },
      properties: {
        id: String(v._id),
        mmsi: v.mmsi,
        name: v.name,
        type: v.type,
        flag: v.flag,
        speed_knots: v.last_position.speed_knots,
        course_deg: v.last_position.course_deg,
        timestamp: v.last_position.timestamp,
      },
    }));
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import express from 'express';
import cors from 'cors';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import { connectDB } from './db.js';
import { seedDatabase } from './seed.js';
import publicGeojsonRouter from './routes/publicGeojson.js';
import vesselsRouter from './routes/vessels.js';
import detectionsRouter from './routes/detections.js';
import hotspotsRouter from './routes/hotspots.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get('/health', (_, res) => res.json({ status: 'ok', db: 'orbis' }));

// Public GeoJSON endpoint — no auth, usable directly in ArcGIS Online
app.use('/', publicGeojsonRouter);

// All /api routes require a valid Clerk session
app.use('/api', requireAuth());
app.use('/api/vessels', vesselsRouter);
app.use('/api/detections', detectionsRouter);
app.use('/api/hotspots', hotspotsRouter);

connectDB()
  .then(async () => {
    // Auto-seed on first boot
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`Orbis API server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

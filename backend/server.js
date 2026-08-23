import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './database/initDb.js';
import apiRouter from './routes/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database and seed if required
let dbReadyPromise = initDatabase().catch(err => {
  console.error('[SmartBlood AI] Database initialization error:', err);
});

// Middleware to ensure DB is initialized
app.use(async (req, res, next) => {
  await dbReadyPromise;
  next();
});

// Mount REST API
app.use('/api', apiRouter);

// Serve static frontend files if production build exists
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      next();
    }
  });
});

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`[SmartBlood AI] Server running on port ${PORT}`);
  });
}

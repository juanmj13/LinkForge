import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// DB
const cs =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}` +
  `@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;

const pool = new Pool({
  connectionString: cs,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

// API (misma ruta de dev)
app.get('/api/vehicles', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, remoteid, "name", rfid, "type", config, createdat, updatedat
      FROM public.vehicles
      ORDER BY id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

// Estáticos de Vite build
const dist = path.resolve(__dirname, '..', 'dist');
app.use(express.static(dist, { maxAge: '1d' }));
app.get('/', (_req, res) => res.redirect('/online.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PROD en http://localhost:${PORT}`));

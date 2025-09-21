import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;  

const app = express();
app.use(cors());           // en dev es útil (en prod puedes quitarlo)
app.use(express.json());

const cs =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}` +
  `@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;

const pool = new Pool({
  connectionString: cs,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

app.get('/api/all-events', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, client_id, "location", area, subarea, device_id, received_at, "version", event_timestamp, device_category, device_name
      FROM public.events
      ORDER BY id DESC;
    `);
    res.json(rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

app.get('/api/devices-list', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (device_id) 
            device_id,
            device_category,
            device_name,
            id,
            client_id,
            "location",
            area,
            subarea,
            received_at,
            "version",
            event_timestamp
      FROM public.events
      ORDER BY device_id, id DESC;

    `);
    res.json(rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB query failed' });
  }
});




const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API dev en http://localhost:${PORT}`));

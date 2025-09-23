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

app.get('/api/device/:deviceId/datapoints', async (req, res) => {
  const { deviceId } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT d.name
      FROM public.datapoints d
      INNER JOIN public.events e ON d.event_id = e.id
      WHERE e.device_id = $1
      ORDER BY d.name;
    `, [deviceId]);

    res.json(rows.map(r => r.name)); // 👉 devuelve solo un array con los nombres
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

// GET /api/device/:deviceId/datapoints/:name
// Ej: /api/device/x123y/datapoints/TankLevel1?from=2025-09-01T00:00:00Z&to=2025-09-22T23:59:59Z&order=desc&limit=500
app.get('/api/device/:deviceId/datapoints/:name', async (req, res) => {
  const { deviceId, name } = req.params;

  // Lee query params (son strings)
  let { from, to, order = 'asc', limit = '1000' } = req.query;

  // Sanitiza y valida fechas (si vienen mal, las anulamos para evitar cast error)
  const isValidISO = (s) => typeof s === 'string' && !isNaN(Date.parse(s));
  from = isValidISO(from) ? from : null;
  to   = isValidISO(to)   ? to   : null;

  // Orden y límite seguros
  const safeOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 1000, 1), 10000);

  try {
    const params = [deviceId, name, from, to, safeLimit];

    const sql = `
      SELECT
        d.id                               AS datapoint_id,
        d.event_id,
        d."name"                           AS name,
        d.value,
        /* value_num: intenta castear el valor a número de forma segura */
        CASE
          WHEN (d.value)::text ~ '^-?\\d+(\\.\\d+)?$'
            THEN (d.value)::text::double precision
          ELSE NULL
        END                                 AS value_num,
        d.units,
        d.port,
        d."type"                           AS type,
        d.received_at                      AS ts,
        e.device_id,
        e.device_name,
        e.device_category
      FROM public.datapoints d
      INNER JOIN public.events e ON d.event_id = e.id
      WHERE e.device_id = $1
        AND d."name" = $2
        AND ($3::timestamptz IS NULL OR d.received_at >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR d.received_at <= $4::timestamptz)
      ORDER BY d.received_at ${safeOrder}
      LIMIT $5
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    // Log detallado al servidor
    console.error('DB error on /api/device/:deviceId/datapoints/:name', {
      deviceId, name, from, to, order: safeOrder, limit: safeLimit, err
    });
    // Mensaje más explícito en dev (opcional puedes dejar solo 'DB query failed' en prod)
    res.status(500).json({ error: 'DB query failed', detail: err.message });
  }
});







const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API dev en http://localhost:${PORT}`));

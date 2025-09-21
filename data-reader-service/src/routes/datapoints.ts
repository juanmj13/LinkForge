import express from 'express';
import { pool } from '../functions/dbClient';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// GET /datapoints?from=2025-06-18T00:00:00Z&to=2025-06-18T23:59:59Z&client_id=123&device_id=456&datapoint_name=temp
router.get('/', async (req, res) => {
    const {
        from,
        to,
        client_id,
        location,
        area,
        subarea,
        device_id,
        device_category,
        device_name,
        datapoint_name,
        units,
        port,
        type
    } = req.query;

    // Validar fechas
    if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
        return res.status(400).json({ error: '"from" and "to" are required and must be ISO strings' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Invalid dates in "from" or "to"' });
    }

    // Query base
    let query = `
        SELECT 
            e.client_id,
            e."location",
            e.area,
            e.subarea,
            e.device_id,
            e.event_timestamp,
            e.received_at AS event_received_at,
            e.device_category,
            e.device_name,
            d."name",
            d.value,
            d.units,
            d.port,
            d."type"
        FROM public.datapoints d
        JOIN public.events e
            ON d.event_id = e.id
        WHERE e.event_timestamp >= $1 AND e.event_timestamp <= $2
    `;

    const values: any[] = [fromDate.toISOString(), toDate.toISOString()];
    let index = 3; // contador para placeholders $3, $4...

    // Filtros opcionales
    const filters: string[] = [];
    const mapQueryParam = (param: any, column: string) => {
        if (param && typeof param === 'string') {
            filters.push(`${column} = $${index}`);
            values.push(param);
            index++;
        }
    }

    mapQueryParam(client_id, 'e.client_id');
    mapQueryParam(location, 'e."location"');
    mapQueryParam(area, 'e.area');
    mapQueryParam(subarea, 'e.subarea');
    mapQueryParam(device_id, 'e.device_id');
    mapQueryParam(device_category, 'e.device_category');
    mapQueryParam(device_name, 'e.device_name');
    mapQueryParam(datapoint_name, 'd."name"');
    mapQueryParam(units, 'd.units');
    mapQueryParam(port, 'd.port');
    mapQueryParam(type, 'd."type"');

    if (filters.length > 0) {
        query += ' AND ' + filters.join(' AND ');
    }

    query += ' ORDER BY e.event_timestamp DESC, d.id';

    try {
        const result = await pool.query(query, values);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error ejecutando query:', err);
        res.status(500).json({ error: 'Error obtaining registers' });
    }
});

export default router;

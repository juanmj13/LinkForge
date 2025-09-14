
import { pool} from "./dbClient";
import { iSmartSensorEvent, iDatapoint } from "../interfaces/interfaces"; // suponiendo que creaste interfaces


// Parse topic segments
export function parseTopic(topic: string) {
  // LinkForge/{clientid}/{location}/{area}/{subarea}/dev/{deviceid}/{devEvent}
  const parts = topic.split("/");
  if (parts.length < 8) throw new Error(`Invalid topic: ${topic}`);
  return {
    client_id: Number(parts[1]),
    location: parts[2],
    area: parts[3],
    subarea: parts[4],
    device_id: parts[6],
  };
}

// Insert event and return inserted id
export async function insertEvent(payload: iSmartSensorEvent, topicData: any): Promise<number> {
  const query = `
    INSERT INTO events (
      client_id, location, area, subarea, device_id,
      version, event_timestamp, device_category, device_name
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id
  `;

  const values = [
    topicData.client_id,
    topicData.location,
    topicData.area,
    topicData.subarea,
    topicData.device_id,
    payload.Version,
    payload.Timestamp,
    payload.Device.Category,
    payload.Device.Name
  ];

  const result = await pool.query(query, values);
  return result.rows[0].id;
}

// Insert datapoints
export async function insertDatapoints(eventId: number, datapoints: iDatapoint[]) {
  if (datapoints.length === 0) return;
  const values: any[] = [];
  const placeholders: string[] = [];

  datapoints.forEach((dp, idx) => {
    const baseIdx = idx * 6;
    placeholders.push(
      `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6})`
    );
    values.push(eventId, dp.Name, dp.Value, dp.Units, dp.Port, dp.Type);
  });

  const query = `
    INSERT INTO datapoints (event_id, name, value, units, port, type)
    VALUES ${placeholders.join(",")}
  `;

  await pool.query(query, values);
}
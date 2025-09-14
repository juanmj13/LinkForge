import "dotenv/config";
import { createMqttClient } from "./functions/mqttClient";
import { closePool } from "./functions/dbClient";
import { insertEvent, insertDatapoints } from "./functions/dataBridge";
import { MqttClient } from "mqtt";
import { iSmartSensorEvent} from "./interfaces/interfaces"; 
import { parseTopic } from "./functions/dataBridge";

// Main function
function main() {
  const { MQTT_TOPICS } = process.env;
  if (!MQTT_TOPICS) throw new Error("MQTT_TOPICS not defined");

  const client: MqttClient = createMqttClient();

  client.on("connect", () => {
    console.log(`[INFO] Connected to MQTT broker`);
    client.subscribe(MQTT_TOPICS, (err) => {
      if (err) {
        console.error("[ERROR] Subscription failed:", err);
        process.exit(1);
      }
      console.log(`[INFO] Subscribed to topics: ${MQTT_TOPICS}`);
    });
  });

  client.on("message", async (topic: string, message: Buffer) => {
    try {
      const payload: iSmartSensorEvent = JSON.parse(message.toString());
      const topicData = parseTopic(topic);

      const eventId = await insertEvent(payload, topicData);
      await insertDatapoints(eventId, payload.Datapoints);

      console.log(`[INFO] Event ${eventId} inserted successfully with ${payload.Datapoints.length} datapoints.`);
    } catch (err) {
      console.error("[ERROR] Failed to process message:", err);
      process.exit(1); // Crash for Docker restart
    }
  });

  client.on("error", (err) => {
    console.error("[ERROR] MQTT client error:", err);
    process.exit(1);
  });

  const shutdown = async () => {
    console.log("[INFO] Shutting down...");
    client.end(true, async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

try {
  main();
} catch (err) {
  console.error("[FATAL] Unhandled error:", err);
  process.exit(1);
}

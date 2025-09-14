import mqtt, { MqttClient } from "mqtt";

export function createMqttClient(): MqttClient {
  const {
    MQTT_BROKER_URL,
    MQTT_BROKER_PORT,
    MQTT_BROKER_USERNAME,
    MQTT_BROKER_PASSWORD,
  } = process.env;

  if (!MQTT_BROKER_URL || !MQTT_BROKER_PORT) {
    throw new Error("MQTT_BROKER_URL and MQTT_BROKER_PORT must be defined in .env");
  }

  const client = mqtt.connect({
    host: MQTT_BROKER_URL,
    port: Number(MQTT_BROKER_PORT),
    protocol: "mqtts", // TLS
    username: MQTT_BROKER_USERNAME,
    password: MQTT_BROKER_PASSWORD,
    reconnectPeriod: 5000, // auto-reconnect after 5s
  });

  return client;
}

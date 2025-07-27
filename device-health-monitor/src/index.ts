//index.ts
// Device Health Monitor - Main Entry Point
import dotenv from 'dotenv';
import mqtt, { MqttClient } from 'mqtt';
import { startPublishing } from './functions/functions';

dotenv.config();

const {
  MQTT_HOST,
  MQTT_PORT,
  MQTT_TLS,
  MQTT_USER,
  MQTT_PASSWORD,
  MQTT_TOPIC,
  PUBLISH_INTERVAL,
  DEVICE_NAME
} = process.env;

// Validate required environment variables
if (!MQTT_HOST || !MQTT_PORT || !MQTT_TOPIC || !PUBLISH_INTERVAL || !DEVICE_NAME) {
  console.error('❌ Missing .env variables.');
  process.exit(1);
}

const protocol = MQTT_TLS === 'true' ? 'mqtts' : 'mqtt';
const brokerUrl = `${protocol}://${MQTT_HOST}:${MQTT_PORT}`;

// Error handling for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

let client: MqttClient;

// Connect to MQTT broker
function connectMQTT() {
  client = mqtt.connect(brokerUrl, {
  username: MQTT_USER,
  password: MQTT_PASSWORD,
  reconnectPeriod: 0 // No recconnect automatically
});

  client.on('connect', () => {
    console.log('✅ Connected to  MQTT');
    startPublishing(PUBLISH_INTERVAL as string, client, MQTT_TOPIC as string, DEVICE_NAME as string);
  });

  client.on('error', (err) => {
    console.error('❌ Error MQTT:', err);
    // In case of error, exit the process
    process.exit(1);
  });
}

// Start the MQTT connection
connectMQTT();

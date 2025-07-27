# Device Health Monitor

Docker‑ready TypeScript microservice for Windows  device health monitoring. Publishes JSON payloads over MQTT with system metadata, performance metrics, and configurable settings via an `.env`.

---

## Features

- Gathers device info (manufacturer, model, serial, UUID)  
- Monitors performance (% CPU, RAM, Disk, GPU utilization)  
- Publishes at configurable intervals over MQTT  
- Fully configurable via `.env`  
- Graceful error handling to let Docker auto‑restart on failures  

---

## Project Structure

```
device-health-monitor/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── functions/
│   │   └── functions.ts         # Data gathering & publishing logic
│   └── interfaces/
│       └── interfaces.ts        # TypeScript interfaces
├── .env.example                 # Sample environment variables
├── Dockerfile                   # Multi‑stage Docker build
├── .dockerignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

- Node.js v16+  
- Docker (optional, for containerized deployment)  

---

## Setup

1. **Clone the repo**  
   ```bash
   git clone <your-repo-url>
   cd device-health-monitor
   ```

2. **Install dependencies**  
   ```bash
   npm install
   ```

3. **Configure environment**  
   Copy and edit:
   ```bash
   cp .env.example .env
   ```
   Fill in:
   ```
   MQTT_HOST=your-broker.host
   MQTT_PORT=8883
   MQTT_TLS=true
   MQTT_USER=yourUser
   MQTT_PASSWORD=yourPass
   MQTT_TOPIC=Your/Topic
   DEVICE_NAME=YourDeviceName
   PUBLISH_INTERVAL=1000
   ```

---

## Scripts

- **build**  
  ```bash
  npm run build
  ```
  Transpiles TypeScript → JavaScript in `dist/`.

- **start**  
  ```bash
  npm run start
  ```
  Builds then runs `dist/index.js`.

- **dev**  
  ```bash
  npm run dev
  ```
  Runs `src/index.ts` via `ts-node` for hot reload.

---

## Docker

1. **Build image**  
   ```bash
   docker build -t device-health-monitor .
   ```

2. **Run container**  
   ```bash
   docker run -d      --name device-health      --restart on-failure      --env-file .env      device-health-monitor
   ```

---

## Usage

Once running, the service logs:

```
✅ Connected to MQTT
🕒 Publishing data every <interval> ms to <topic>
📤 Published to <topic>
```

Check your MQTT broker for incoming JSON messages.

## License
MIT

## Author
- Juan Manuel Jiménez [juan.jimenez.c13@gmail.com]


# Device Health Monitor

**Work‑in‑progress** TypeScript microservice for Windows device health monitoring. Publishes JSON payloads over MQTT with system metadata, performance metrics, and configurable settings via an `.env`.

---

## Features

- Gathers device info (manufacturer, model, serial, UUID)  
- Monitors performance (% CPU, RAM, Disk, GPU utilization)  
- Publishes at configurable intervals over MQTT  
- Fully configurable via `.env`  
- Graceful error handling to restart on failures  

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
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

- Node.js v16+  
- npm (comes with Node.js)  
- PM2 (`npm install -g pm2`)  

---

## Setup

1. **Clone the repo**  
   ```bash
   git clone <https://github.com/juanmj13/microservice-playground.git>
   cd device-health-monitor
   ```

2. **Install dependencies**  
   ```bash
   npm install
   ```

3. **Configure environment**  
   Create your .env file according to the following:
   
   ```ini
   MQTT_HOST=your-broker.host
   MQTT_PORT=8883
   MQTT_TLS=true
   MQTT_USER=yourUser
   MQTT_PASSWORD=yourPass
   MQTT_TOPIC=Your/Topic
   DEVICE_NAME=YourDeviceName
   PUBLISH_INTERVAL=6000
   ```

4. **Build**  
   ```bash
   npm run build
   ```

5. **Run**  
   ```bash
   npm run start
   ```

---

## Running with PM2

Start the service under PM2 to keep it alive and auto‑restart on error:

```bash
# Install PM2 globally if you haven't already
npm install -g pm2

# Start the built script and give it a name
pm2 start dist/index.js --name device-health-monitor

# View process list
pm2 list

# Follow logs in real time
pm2 logs device-health-monitor
```

---

## Auto‑start on Windows

### Windows Scheduled Task

1. Open PowerShell **as Administrator**.

2. Run:
   ```powershell
   $action    = New-ScheduledTaskAction -Execute "$env:APPDATA pm\pm2.cmd" -Argument "resurrect"
   $trigger   = New-ScheduledTaskTrigger -AtLogOn
   $settings  = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
   Register-ScheduledTask `
     -TaskName "PM2 Resurrect DeviceHealth" `
     -Action $action `
     -Trigger $trigger `
     -Settings $settings `
     -RunLevel Highest
   ```

This task will run `pm2 resurrect` at each logon, reloading your saved processes automatically.

---

## Monitoring & Logs

- **Dashboard**  
  ```bash
  pm2 monit
  ```

- **Rotate logs** (optional):
  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 3
  ```

---

## License

MIT

## Author

Juan Manuel Jiménez (<juan.jimenez.c13@gmail.com>)

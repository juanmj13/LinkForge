// device-health-monitor/src/functions/functions.ts
// Functions for gathering and publishing device health data
import si from 'systeminformation';
import { MqttClient } from 'mqtt';
import { DeviceHealthData } from '../interfaces/interfaces';

export async function gatherData(deviceName: string): Promise<DeviceHealthData> {
  console.log('🔍 Gathering system information...');
  const [sys, cpuLoad, mem, disk, gpu] = await Promise.all([
    si.system(),
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.graphics()
  ]);

  // Calculate percentages and format to 2 decimals
  const cpuPct = parseFloat(cpuLoad.currentLoad.toFixed(2));
  const memPct = parseFloat(((mem.used / mem.total) * 100).toFixed(2));
  const diskStats = disk.map(d => ({
    fs: d.fs,
    usage: parseFloat(((d.used / d.size) * 100).toFixed(2))
  }));
  const gpuStats = gpu.controllers.map(g => ({
    model: g.model,
    vendor: g.vendor,
    utilization: parseFloat((g.utilizationGpu ?? 0).toFixed(2))
  }));

  return {
    Timestamp: new Date().toISOString(),
    DeviceName: deviceName || 'Unknown Device',
    DeviceInfo: {
      manufacturer: sys.manufacturer,
      model: sys.model,
      serial: sys.serial,
      uuid: sys.uuid
    },
    DevicePerformance: {
      cpuLoad: cpuPct,         
      memoryUsage: memPct,     
      diskUsage: diskStats,    
      gpu: gpuStats            
    }
  };
}

let intervalHandle: NodeJS.Timer;

// Publish data at intervals
export function startPublishing(publishInterval: string, client: MqttClient, topic: string, deviceName: string) {
  console.log(`🕒 Publishing data every ${publishInterval} ms to ${topic}`);
  const interval = parseInt(publishInterval!, 10);
  intervalHandle = setInterval(async () => {
    try {
      const payload = await gatherData(deviceName);
      client.publish(topic!, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) throw err;
        console.log('📤 Published to', topic);
      });
    } catch (err) {
      console.error('❌ Error gathering/publishing data:', err);
      process.exit(1);
    }
  }, interval);
}
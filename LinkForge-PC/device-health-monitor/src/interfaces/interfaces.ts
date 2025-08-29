//Interfaces for device health monitoring system

interface DeviceInfo {
  manufacturer: string;
  model: string;
  serial: string;
  uuid: string;
}

interface DiskUsageItem {
  fs: string;
  usage: number;
}

interface GPUItem {
  model: string;
  vendor: string;
  utilization: number;
}

interface DevicePerformance {
  cpuLoad: number;
  memoryUsage: number;
  diskUsage: DiskUsageItem[];
  gpu: GPUItem[];
}

export interface DeviceHealthData {
  Timestamp: string;
  DeviceName: string;             
  DeviceInfo: DeviceInfo;
  DevicePerformance: DevicePerformance;
}

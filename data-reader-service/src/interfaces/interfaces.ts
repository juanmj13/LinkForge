export interface iSmartSensorEvent {
  Version: string;
  Timestamp: string; // ISO 8601
  Device: iDevice;
  Datapoints: iDatapoint[];
}

export interface iDevice {
  Category: string;
  Name: string;
}

export type iDatapointType = "Digital" | "Analog" | "System";

export interface iDatapoint {
  Name: string;
  Value: number;
  Units: string;
  Port: number;
  Type: iDatapointType;
}

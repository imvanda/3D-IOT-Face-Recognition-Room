export enum DeviceType {
  LIGHT = 'LIGHT',
  AC = 'AC',
  CURTAIN = 'CURTAIN',
  DESK = 'DESK',
  PROJECTOR = 'PROJECTOR',
  PURIFIER = 'PURIFIER',
  HUMIDIFIER = 'HUMIDIFIER',
  ROBOT = 'ROBOT',
  SENSOR = 'SENSOR',
  CAMERA = 'CAMERA'
}

export interface IotDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: boolean;
  value?: number | string; // e.g., temperature, height, percentage
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}

export interface CameraState {
  isActive: boolean;
  triggeredBy: string | null; // ID of the virtual camera that triggered it
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string; // Base64 or URL
  registeredAt: number;
}

export interface Preset {
  id: string;
  name: string;
  userId: string;
  userName: string;
  faceImage: string; // Base64
  gestureImage: string; // Base64
  deviceStates: {
    deviceId: string;
    status: boolean;
    value?: number | string;
  }[];
  createdAt: number;
}
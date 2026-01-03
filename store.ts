import { create } from 'zustand';
import { DeviceType, IotDevice, UserProfile } from './types';
import { api } from './services/api';
import { mqttService } from './services/mqtt';

interface AppState {
  devices: IotDevice[];
  toggleDevice: (id: string) => Promise<void>;
  setDeviceValue: (id: string, value: number | string) => Promise<void>;
  updateDevicesFromAI: (updates: Partial<IotDevice>[]) => void;
  fetchDevices: () => Promise<void>;
  
  // Camera Interaction Logic
  lookingAtCameraId: string | null;
  lookAtProgress: number; // 0 to 100
  setLookingAtCamera: (id: string | null) => void;
  incrementLookProgress: (delta: number) => void;
  resetLookProgress: () => void;
  
  // Real Webcam Modal & Identity System
  isWebcamOpen: boolean;
  openWebcam: () => void;
  closeWebcam: () => void;
  
  // User Identity System
  // registeredUsers: UserProfile[]; // Removed: Frontend no longer manages the DB
  activeUsers: UserProfile[]; // Users currently "detected" by the system
  isAuthOverlayOpen: boolean;
  setAuthOverlayOpen: (isOpen: boolean) => void;
  
  // Async Actions
  registerUser: (name: string, faceImage: string) => Promise<void>;
  performFaceRecognition: (faceImage: string) => Promise<void>;
  logoutUser: (id: string) => void;
  
  // Custom Textures (User Uploads)
  textures: {
    floor: string | null;
    wall: string | null;
    desk: string | null;
    windowView: string | null;
    projector: string | null;
  };
  setTexture: (key: 'floor' | 'wall' | 'desk' | 'windowView' | 'projector', url: string) => void;

  // Pointer Lock State
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;

  // Chat/Log
  logs: string[];
  addLog: (msg: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  devices: [
    { id: 'light-main', name: '智能吸顶灯', type: DeviceType.LIGHT, isOn: true, position: [0, 2.9, 0], color: '#ffffff', value: 80 },
    { id: 'ac', name: '空调', type: DeviceType.AC, isOn: false, position: [-4.8, 2.4, 0], rotation: [0, Math.PI / 2, 0], value: 24 },
    { id: 'curtain', name: '智能窗帘', type: DeviceType.CURTAIN, isOn: false, position: [4.9, 1.5, 0], rotation: [0, Math.PI / 2, 0], value: 0 }, 
    { id: 'desk', name: '升降桌', type: DeviceType.DESK, isOn: true, position: [0, 0, 0], rotation: [0, -Math.PI / 2, 0], value: 75 }, 
    { id: 'projector', name: '投影仪', type: DeviceType.PROJECTOR, isOn: false, position: [0, 2.8, 2], rotation: [0, Math.PI, 0] },
    { id: 'purifier', name: '空气净化器', type: DeviceType.PURIFIER, isOn: true, position: [-4.2, 0, -4.2], rotation: [0, Math.PI / 4, 0], value: 'Auto' },
    { id: 'humidifier', name: '加湿器', type: DeviceType.HUMIDIFIER, isOn: false, position: [-4.5, 0, 2.5], rotation: [0, Math.PI / 2, 0] },
    { id: 'robot', name: '扫地机器人', type: DeviceType.ROBOT, isOn: false, position: [3, 0.1, -3] },
    { id: 'sensor', name: '温湿度传感器', type: DeviceType.SENSOR, isOn: true, position: [-4.95, 1.5, 1], rotation: [0, Math.PI / 2, 0], value: '24°C / 45%' },
    { id: 'cam-1', name: '摄像头 (前左)', type: DeviceType.CAMERA, isOn: true, position: [-4.5, 2.8, -4.5], rotation: [0, -Math.PI / 4, -Math.PI / 6] },
    { id: 'cam-2', name: '摄像头 (前右)', type: DeviceType.CAMERA, isOn: true, position: [4.5, 2.8, -4.5], rotation: [0, Math.PI / 4, -Math.PI / 6] },
    { id: 'cam-3', name: '摄像头 (后左)', type: DeviceType.CAMERA, isOn: true, position: [-4.5, 2.8, 4.5], rotation: [0, -Math.PI * 0.75, -Math.PI / 6] },
    { id: 'cam-4', name: '摄像头 (后右)', type: DeviceType.CAMERA, isOn: true, position: [4.5, 2.8, 4.5], rotation: [0, Math.PI * 0.75, -Math.PI / 6] },
  ],

  toggleDevice: async (id) => {
    // 乐观更新：立即切换状态
    const device = get().devices.find(d => d.id === id);
    if (!device) return;
    
    const previousState = device.isOn;
    const newState = !previousState;
    
    set((state) => ({
      devices: state.devices.map((d) => d.id === id ? { ...d, isOn: newState } : d),
      logs: [...state.logs, `已${newState ? '开启' : '关闭'} ${device.name}`]
    }));

    try {
      // 发送请求给后端
      const result = await api.toggleDevice(id);
      
      // 再次确认状态（虽然通常是一致的）
      if (result.isOn !== newState) {
          set((state) => ({
            devices: state.devices.map((d) => d.id === id ? { ...d, isOn: result.isOn } : d)
          }));
      }
    } catch (error: any) {
      // 失败回滚
      set((state) => ({
        devices: state.devices.map((d) => d.id === id ? { ...d, isOn: previousState } : d),
        logs: [...state.logs, `切换设备失败: ${error.message}`]
      }));
    }
  },

  setDeviceValue: async (id, value) => {
    // 先更新本地状态（立即响应，不等待API）
    set((state) => ({
      devices: state.devices.map((d) => d.id === id ? { ...d, value } : d)
    }));
    
    // 然后异步发送到后端
    try {
      await api.setDeviceValue(id, value);
    } catch (error: any) {
      set((state) => ({
        logs: [...state.logs, `更新设备参数失败: ${error.message}`]
      }));
    }
  },

  fetchDevices: async () => {
    try {
      const devices = await api.getDevices();
      set({ devices });
    } catch (error: any) {
      set((state) => ({
        logs: [...state.logs, `获取设备列表失败: ${error.message}`]
      }));
    }
  },

  updateDevicesFromAI: async (updates) => {
    try {
      await api.batchUpdateDevices(updates);
      set((state) => {
        const newDevices = state.devices.map(d => {
          const update = updates.find(u => u.id === d.id || u.name === d.name);
          if (update) {
            return { ...d, ...update };
          }
          return d;
        });
        return { devices: newDevices, logs: [...state.logs, 'AI 更新了设备状态'] };
      });
    } catch (error: any) {
      set((state) => ({
        logs: [...state.logs, `AI 批量更新失败: ${error.message}`]
      }));
    }
  },

  // Interaction
  lookingAtCameraId: null,
  lookAtProgress: 0,
  setLookingAtCamera: (id) => set({ lookingAtCameraId: id }),
  incrementLookProgress: (delta) => set((state) => {
    const next = state.lookAtProgress + delta;
    if (next >= 100 && !state.isWebcamOpen) {
      return { lookAtProgress: 0, isWebcamOpen: true, logs: [...state.logs, `连接到物理摄像头...`] };
    }
    return { lookAtProgress: Math.min(next, 100) };
  }),
  resetLookProgress: () => set({ lookAtProgress: 0 }),

  // Webcam Modal
  isWebcamOpen: false,
  openWebcam: () => set({ isWebcamOpen: true }),
  closeWebcam: () => set({ isWebcamOpen: false, lookAtProgress: 0 }),
  
  // User Identity System
  activeUsers: [],
  isAuthOverlayOpen: true, 
  setAuthOverlayOpen: (isOpen) => set({ isAuthOverlayOpen: isOpen }),
  
  registerUser: async (name, faceImage) => {
    try {
        set(state => ({ logs: [...state.logs, `正在连接后端注册: ${name}...`] }));
        const newUser = await api.registerUser(name, faceImage);
        
        set(state => ({ 
            activeUsers: [...state.activeUsers, newUser],
            isAuthOverlayOpen: false,
            logs: [...state.logs, `用户注册成功: ${name}`]
        }));
    } catch (e: any) {
        set(state => ({ logs: [...state.logs, `注册失败: ${e.message}`] }));
        throw e; // Re-throw to UI
    }
  },

  performFaceRecognition: async (faceImage) => {
     try {
         const user = await api.recognizeFace(faceImage);
         const { activeUsers } = get();
         
         const isAlreadyActive = activeUsers.find(u => u.id === user.id);
         
         if (!isAlreadyActive) {
             set(state => ({
                 activeUsers: [...state.activeUsers, user],
                 logs: [...state.logs, `识别成功: 欢迎回来, ${user.name}`]
             }));
         } else {
             set(state => ({ logs: [...state.logs, `已确认身份: ${user.name}`] }));
         }
     } catch (e: any) {
         set(state => ({ logs: [...state.logs, `识别失败: ${e.message}`] }));
         throw e;
     }
  },

  logoutUser: (id) => set(state => ({
      activeUsers: state.activeUsers.filter(u => u.id !== id),
      logs: [...state.logs, '用户已登出']
  })),

  // Custom Textures
  textures: { floor: null, wall: null, desk: null, windowView: null, projector: null },
  setTexture: (key, url) => set((state) => ({ textures: { ...state.textures, [key]: url } })),

  // Pointer Lock State
  isLocked: false,
  setIsLocked: (locked) => set({ isLocked: locked }),

  logs: [],
  addLog: (msg) => set((state) => ({ logs: [...state.logs, msg].slice(-5) })),

  // MQTT connection
  initializeMQTT: async () => {
    // 防止重复连接
    if ((mqttService as any).client?.connected) {
      console.log('[MQTT] Already connected, skipping initialization');
      return;
    }

    try {
      await mqttService.connect();
      // 订阅设备状态变化（包含 isOn, value, 等属性）
      mqttService.subscribeDevices((deviceData) => {
        console.log('[MQTT] Received device update:', deviceData);
        set((state) => {
          const deviceId = deviceData.deviceId;
          if (!deviceId) {
            console.warn('[MQTT] Missing deviceId in message:', deviceData);
            return state;
          }

          const existingDevice = state.devices.find(d => d.id === deviceId);
          if (!existingDevice) {
            console.warn('[MQTT] Device not found:', deviceId);
            return state;
          }

          // 更新设备状态
          // 注意：如果设备值没有变化，不更新（避免覆盖用户正在输入的值）
          let hasChange = false;
          const updatedDevices = state.devices.map((d) => {
            if (d.id === deviceId) {
              const updated: IotDevice = { ...d };
              
              if (deviceData.isOn !== undefined && deviceData.isOn !== d.isOn) {
                updated.isOn = deviceData.isOn;
                hasChange = true;
              }
              if (deviceData.value !== undefined && deviceData.value !== d.value) {
                updated.value = deviceData.value;
                hasChange = true;
              }
              
              return hasChange ? updated : d;
            }
            return d;
          });
          
          return {
            devices: updatedDevices,
            logs: hasChange ? [...state.logs, `设备 ${existingDevice.name} 状态已更新`] : state.logs
          };
        });
      });
    } catch (error: any) {
      console.error('MQTT connection failed:', error);
      set((state) => ({
        logs: [...state.logs, `MQTT 连接失败: ${error.message}`]
      }));
    }
  },

  disconnectMQTT: () => {
    mqttService.disconnect();
  },
}));
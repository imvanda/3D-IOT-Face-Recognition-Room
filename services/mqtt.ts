import mqtt, { MqttClient } from 'mqtt';

// MQTT Broker 配置
const MQTT_BROKER_URL = 'ws://localhost:9001';
const MQTT_TOPIC_DEVICES = 'iot/room/devices';
const MQTT_TOPIC_DEVICE_PREFIX = 'iot/room/devices/';

console.log('[MQTT Service] Initializing...');
console.log('[MQTT Service] Broker URL:', MQTT_BROKER_URL);
console.log('[MQTT Service] Devices Topic:', MQTT_TOPIC_DEVICES);

class MqttService {
  private client: MqttClient | null = null;
  private subscriptions: Map<string, (message: any) => void> = new Map();

  /**
   * 连接到 MQTT Broker
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(MQTT_BROKER_URL);

      this.client.on('connect', () => {
        console.log('MQTT Client connected');
        console.log('[MQTT] Connected to:', MQTT_BROKER_URL);
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('MQTT Client error:', err);
        reject(err);
      });

      this.client.on('reconnect', () => {
        console.log('MQTT Client reconnecting...');
      });

      this.client.on('message', (topic, message) => {
        console.log('[MQTT] Message received on topic:', topic);
        const callback = this.subscriptions.get(topic);
        if (callback) {
          try {
            const data = JSON.parse(message.toString());
            console.log('[MQTT] Payload:', data);
            callback(data);
          } catch (error) {
            console.error('[MQTT] Failed to parse message:', error);
          }
        } else {
          console.warn('[MQTT] No callback for topic:', topic);
        }
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  /**
   * 订阅主题
   */
  subscribe(topic: string, callback: (message: any) => void): void {
    if (this.client) {
      this.client.subscribe(topic);
      this.subscriptions.set(topic, callback);
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(topic: string): void {
    if (this.client) {
      this.client.unsubscribe(topic);
      this.subscriptions.delete(topic);
    }
  }

  /**
   * 发布消息
   */
  publish(topic: string, message: any): void {
    if (this.client) {
      this.client.publish(topic, JSON.stringify(message));
    }
  }

  /**
   * 订阅所有设备状态变化
   */
  subscribeDevices(callback: (device: any) => void): void {
    this.subscribe(MQTT_TOPIC_DEVICES, callback);
  }

  /**
   * 订阅单个设备状态变化
   */
  subscribeDevice(deviceId: string, callback: (device: any) => void): void {
    const topic = `${MQTT_TOPIC_DEVICE_PREFIX}${deviceId}`;
    this.subscribe(topic, callback);
  }

  /**
   * 发布设备状态更新
   */
  publishDeviceUpdate(deviceId: string, deviceData: any): void {
    const topic = `${MQTT_TOPIC_DEVICE_PREFIX}${deviceId}`;
    this.publish(topic, deviceData);
  }
}

// 导出单例实例
export const mqttService = new MqttService();

import { UserProfile, IotDevice, Preset } from "../types";

// 后端 API 基础地址
// 开发环境：直接连接 Node-RED（绕过 Vite 代理的 FormData 问题）
// 生产环境：使用相对路径通过代理
const API_BASE_URL = import.meta.env.DEV
    ? 'http://localhost:1880/api/v1'
    : '/api/v1';

// Django 后端 API 基础地址
const DJANGO_API_BASE_URL = 'http://localhost:8000/api';

export const api = {
    /**
     * 用户注册接口（使用 JSON + base64）
     * @param name 用户名
     * @param faceImageBase64 人脸图片的 Base64 字符串
     */
    registerUser: async (name: string, faceImageBase64: string): Promise<UserProfile> => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                file: faceImageBase64
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '注册失败');
        }

        return await response.json();
    },

    /**
     * 人脸识别接口（使用 JSON + base64）
     * @param faceImageBase64 当前摄像头截图的 Base64 字符串
     */
    recognizeFace: async (faceImageBase64: string): Promise<UserProfile> => {
        const response = await fetch(`${API_BASE_URL}/auth/recognize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file: faceImageBase64
            }),
        });

        if (!response.ok) {
            // 404 通常表示未找到匹配用户
            if (response.status === 404) {
                throw new Error('未识别到已知用户');
            }
            throw new Error('人脸识别服务异常');
        }

        return await response.json();
    },

    /**
     * 获取所有设备列表
     */
    getDevices: async (): Promise<IotDevice[]> => {
        const response = await fetch(`${API_BASE_URL}/devices`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error('获取设备列表失败');
        }

        return await response.json();
    },

    /**
     * 切换设备开关状态
     * @param deviceId 设备 ID
     * @param status 目标开关状态
     */
    toggleDevice: async (deviceId: string, status: boolean): Promise<{ id: string; status: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            throw new Error('切换设备状态失败');
        }

        return await response.json();
    },

    /**
     * 更新设备参数值
     * @param deviceId 设备 ID
     * @param value 新的参数值
     */
    setDeviceValue: async (deviceId: string, value: number | string): Promise<{ id: string; value: number | string }> => {
        const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/value`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value }),
        });

        if (!response.ok) {
            throw new Error('更新设备参数失败');
        }

        return await response.json();
    },

    /**
     * 批量更新设备状态（用于 AI 语音控制）
     * @param updates 设备更新数组
     */
    batchUpdateDevices: async (updates: Partial<IotDevice>[]): Promise<{ success: boolean; updated: number; devices: Partial<IotDevice>[] }> => {
        const response = await fetch(`${API_BASE_URL}/devices/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error('批量更新设备失败');
        }

        return await response.json();
    },

    /**
     * 完全更新设备状态
     * @param deviceId 设备 ID
     * @param updates 更新对象
     */
    updateDevice: async (deviceId: string, updates: Partial<IotDevice>): Promise<IotDevice> => {
        const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error('更新设备失败');
        }

        return await response.json();
    },

    /**
     * 保存预设（Django后端）
     * @param userName 用户名称
     * @param faceImageBase64 人脸图片的 Base64 字符串
     * @param gestureImageBase64 手势图片的 Base64 字符串
     * @param deviceStates 设备状态数组
     */
    savePreset: async (userName: string, faceImageBase64: string, gestureImageBase64: string, deviceStates: { deviceId: string; status: boolean; value?: number | string }[]): Promise<Preset> => {
        const response = await fetch(`${DJANGO_API_BASE_URL}/presets/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_name: userName,
                face_image: faceImageBase64,
                gesture_image: gestureImageBase64,
                device_states: deviceStates,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '保存预设失败');
        }

        return await response.json();
    },

    /**
     * 识别预设（Django后端 - 通过人脸+手势识别）
     * @param faceImageBase64 人脸图片的 Base64 字符串
     * @param gestureImageBase64 手势图片的 Base64 字符串
     */
    recognizePreset: async (faceImageBase64: string, gestureImageBase64: string): Promise<Preset> => {
        const response = await fetch(`${DJANGO_API_BASE_URL}/presets/recognize/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                face_image: faceImageBase64,
                gesture_image: gestureImageBase64,
            }),
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('未识别到预设');
            }
            const error = await response.json();
            throw new Error(error.message || '识别预设失败');
        }

        return await response.json();
    }
};
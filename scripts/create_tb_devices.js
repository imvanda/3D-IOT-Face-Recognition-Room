const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TB_URL = 'http://localhost:8080';
const USERNAME = 'tenant@thingsboard.org';
const PASSWORD = 'tenant';

const DEVICES = [
    { name: '智能吸顶灯', type: 'LIGHT', label: 'light-main' },
    { name: '空调', type: 'AC', label: 'ac' },
    { name: '智能窗帘', type: 'CURTAIN', label: 'curtain' },
    { name: '升降桌', type: 'DESK', label: 'desk' },
    { name: '投影仪', type: 'PROJECTOR', label: 'projector' },
    { name: '空气净化器', type: 'PURIFIER', label: 'purifier' },
    { name: '加湿器', type: 'HUMIDIFIER', label: 'humidifier' },
    { name: '扫地机器人', type: 'ROBOT', label: 'robot' },
    { name: '温湿度传感器', type: 'SENSOR', label: 'sensor' },
    { name: '摄像头(前左)', type: 'CAMERA', label: 'cam-1' },
    { name: '摄像头(前右)', type: 'CAMERA', label: 'cam-2' },
    { name: '摄像头(后左)', type: 'CAMERA', label: 'cam-3' },
    { name: '摄像头(后右)', type: 'CAMERA', label: 'cam-4' }
];

async function login() {
    try {
        const response = await axios.post(`${TB_URL}/api/auth/login`, {
            username: USERNAME,
            password: PASSWORD
        });
        return response.data.token;
    } catch (error) {
        console.error('Login failed:', error.message);
        process.exit(1);
    }
}

async function getTenantDevice(token, deviceName) {
    try {
        const response = await axios.get(`${TB_URL}/api/tenant/devices?deviceName=${encodeURIComponent(deviceName)}`, {
            headers: { 'X-Authorization': `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        return null;
    }
}

async function createDevice(token, device) {
    try {
        const response = await axios.post(`${TB_URL}/api/device`, {
            name: device.name,
            type: device.type,
            label: device.label
        }, {
            headers: { 'X-Authorization': `Bearer ${token}` }
        });
        console.log(`Created device: ${device.name}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to create device ${device.name}:`, error.message);
        return null;
    }
}

async function getDeviceCredentials(token, deviceId) {
    try {
        const response = await axios.get(`${TB_URL}/api/device/${deviceId.id}/credentials`, {
            headers: { 'X-Authorization': `Bearer ${token}` }
        });
        return response.data.credentialsId;
    } catch (error) {
        console.error(`Failed to get credentials for ${deviceId.id}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Starting ThingsBoard device synchronization...');
    const token = await login();

    const deviceTokens = [];

    for (const device of DEVICES) {
        let deviceObj = await getTenantDevice(token, device.name);
        
        if (!deviceObj) {
            deviceObj = await createDevice(token, device);
        } else {
            console.log(`- Device exists: ${device.name}`);
        }

        if (deviceObj) {
            const accessToken = await getDeviceCredentials(token, deviceObj.id);
            if (accessToken) {
                deviceTokens.push({
                    label: device.label,
                    accessToken: accessToken
                });
            }
        }
    }

    // --- 路径逻辑修正 ---
    // __dirname 是 D:\...\3dRoomV2\scripts
    // 使用 path.resolve 确保跳转到 D:\...\3dRoomV2\nodered-data
    const targetDir = path.resolve(__dirname, '..', 'nodered-data');
    const outputPath = path.join(targetDir, 'tb_device_tokens.json');

    // 确保目录存在
    if (!fs.existsSync(targetDir)) {
        console.log(`📁 Creating directory: ${targetDir}`);
        fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(deviceTokens, null, 2));
    
    console.log(`\n✅ Successfully synchronized ${deviceTokens.length} devices.`);
    console.log(`📍 File saved to: ${outputPath}`);
    console.log(`ℹ️  Node-RED can now read this from /data/tb_device_tokens.json`);
}

main();
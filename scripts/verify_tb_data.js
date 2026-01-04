
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

async function verify() {
    console.log('Verifying telemetry on ThingsBoard via REST API...');
    
    // Expected values
    const expectedValues = {
        'light-main': { status: true, value: 80 }, // brightness
        'ac': { status: true, value: 24 }, // temperature
        'curtain': { status: true, value: 60 }, // openPercentage
        'desk': { status: true, value: 100 }, // height
        'purifier': { status: true, value: 'Auto' }, // mode
        'sensor': { status: true, value: '25C/50%' }, // reading
        'cam-1': { status: true },
        'cam-2': { status: true },
        'cam-3': { status: true },
        'cam-4': { status: true }
    };

    let success = true;

    try {
        // Login
        const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
            username: 'tenant@thingsboard.org',
            password: 'tenant'
        });
        const jwt = loginRes.data.token;
        const headers = { 'X-Authorization': `Bearer ${jwt}` };

        // Get Tenant Devices
        const devicesRes = await axios.get('http://localhost:8080/api/tenant/devices?pageSize=100&page=0', { headers });
        const tbDevices = devicesRes.data.data;
        
        const nameToId = {};
        tbDevices.forEach(d => nameToId[d.name] = d.id.id);

        for (const [frontendId, expected] of Object.entries(expectedValues)) {
            const nameMap = {
                'light-main': '智能吸顶灯',
                'ac': '空调',
                'curtain': '智能窗帘',
                'desk': '升降桌',
                'purifier': '空气净化器',
                'sensor': '温湿度传感器',
                'cam-1': '摄像头(前左)',
                'cam-2': '摄像头(前右)',
                'cam-3': '摄像头(后左)',
                'cam-4': '摄像头(后右)'
            };
            
            const tbName = nameMap[frontendId];
            if (!tbName) {
                 console.warn(`No name mapping for ${frontendId}, skipping.`);
                 continue;
            }
            
            const tbId = nameToId[tbName];
            if (!tbId) {
                console.error(`Device ${tbName} not found in ThingsBoard.`);
                success = false;
                continue;
            }

            // Get Telemetry
            const keys = 'status,value,brightness,temperature,openPercentage,height,mode,reading';
            const telRes = await axios.get(`http://localhost:8080/api/plugins/telemetry/DEVICE/${tbId}/values/timeseries?keys=${keys}&useStrictDataTypes=false`, { headers });
            const data = telRes.data;

            console.log(`[${frontendId} / ${tbName}] Telemetry:`, JSON.stringify(data));

            // Verify status
            if (data.status) {
                const actualStatus = data.status[0].value === 'true' || data.status[0].value === true;
                if (actualStatus !== expected.status) {
                    console.error(`❌ [${frontendId}] status Mismatch! Expected: ${expected.status}, Got: ${actualStatus}`);
                    success = false;
                } else {
                     console.log(`✅ [${frontendId}] status Verified: ${actualStatus}`);
                }
            } else {
                 // Some devices might not have status telemetry if not sent yet, but here we expect it
                 console.warn(`⚠️ [${frontendId}] Missing status telemetry.`);
            }

            // Verify Value
            if (expected.value !== undefined) {
                let expectedKey = 'value';
                let expectedValue = expected.value;

                if (frontendId === 'light-main') expectedKey = 'brightness';
                if (frontendId === 'ac') expectedKey = 'temperature';
                if (frontendId === 'curtain') expectedKey = 'openPercentage';
                if (frontendId === 'desk') expectedKey = 'height';
                if (frontendId === 'purifier') expectedKey = 'mode';
                if (frontendId === 'sensor') expectedKey = 'reading';

                if (data[expectedKey]) {
                    const actualValue = data[expectedKey][0].value;
                    if (String(actualValue) === String(expectedValue)) {
                         console.log(`[${frontendId}] ✅ ${expectedKey} matched: ${actualValue}`);
                    } else {
                         console.error(`[${frontendId}] ❌ ${expectedKey} mismatch. Expected ${expectedValue}, got ${actualValue}`);
                         success = false;
                    }
                } else {
                    console.error(`[${frontendId}] ❌ Missing key: ${expectedKey}`);
                    success = false;
                }
            }
        }

    } catch (error) {
        console.error('REST API Error:', error.response ? error.response.data : error.message);
        success = false;
    }

    if (success) {
        console.log('ALL VERIFICATIONS PASSED');
    } else {
        console.error('SOME VERIFICATIONS FAILED');
        process.exit(1);
    }
}

verify().catch(console.error);

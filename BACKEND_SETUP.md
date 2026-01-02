# 后端集成完整说明

## 已完成的工作

### 1. Node-RED API 流程
已配置以下接口：

**认证相关:**
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/recognize` - 人脸识别

**设备管理:**
- `GET /api/v1/devices` - 获取所有设备（14个，包含4个摄像头）
- `POST /api/v1/devices/:id/toggle` - 切换设备开关
- `PUT /api/v1/devices/:id/value` - 更新设备参数值
- `PUT /api/v1/devices/:id` - 完整更新设备状态
- `POST /api/v1/devices/batch` - 批量更新设备（AI 语音控制）

### 2. 前端服务层更新
- ✅ `services/api.ts` - 完整的 API 调用函数
- ✅ `services/mqtt.ts` - MQTT 客户端服务
- ✅ `store.ts` - 集成后端 API 和 MQTT 实时更新
- ✅ `App.tsx` - 初始化时获取设备和连接 MQTT

### 3. MQTT 配置
- ✅ `mosquitto/config/mosquitto.conf` - MQTT Broker 配置
- ✅ 端口 1883 (TCP) 和 9001 (WebSocket)

### 4. Vite 代理配置
- ✅ `/api/v1` 请求代理到 Node-RED (localhost:1880)

---

## 部署步骤

### 第一步：导入 Node-RED Flows

1. 打开 http://localhost:1880
2. 点击右上角菜单 → **Import**
3. 选择 `flows_corrected.json` 文件
4. 点击 **Import**
5. 点击右上角 **Deploy** 按钮

### 第二步：重启服务

```bash
# 重启 Docker 服务（如果需要）
docker-compose restart

# 重启前端开发服务器
npm run dev
```

### 第三步：验证功能

1. **测试设备接口**（浏览器控制台）:
```javascript
// 获取设备列表
fetch('/api/v1/devices').then(r => r.json()).then(console.log)

// 应该返回 14 个设备
```

2. **测试 MQTT 连接**（在浏览器控制台）:
   - 打开应用后，控制台应该显示 "MQTT Client connected"
   - 查看网络连接中的 WebSocket 连接到 ws://localhost:9001

---

## 后续集成 TODO

### 1. 人脸识别集成（Node-RED）

**选项 A：使用 Python face-recognition（推荐）**
在 Node-RED 中添加 `exec` 节点调用 Python 脚本：
```javascript
// Register - Process 节点修改
const fs = require('fs');
const path = '/data/face_images/' + userId + '.jpg';
fs.writeFileSync(path, file.buffer);

// 调用 Python 脚本提取特征
const exec = require('child_process').exec;
exec(`python /data/extract_face.py ${path}`, (err, stdout) => {
    msg.faceEncoding = stdout.trim();
    return msg;
});
```

**选项 B：使用 face-api.js（纯 JavaScript）**
在 Node-RED 中使用 `function` 节点直接调用 face-api.js。

### 2. ThingsBoard 集成

在 Node-RED 中添加 `thingsboard` 节点（需要安装 `node-red-contrib-thingsboard`）：
1. 连接 ThingsBoard 保存设备状态
2. 使用 ThingsBoard REST API 获取设备列表
3. 订阅 ThingsBoard 的设备属性变化，发布到 MQTT

### 3. MQTT 设备状态发布

在 Node-RED 的设备更新接口中，添加 MQTT out 节点：
- 当设备状态更新时，发布到 `iot/room/devices/{device_id}`
- 前端订阅该 topic，实现实时同步

---

## 故障排查

### 问题 1：前端无法连接 Node-RED
**原因**: Vite 代理未配置或 Node-RED 未运行
**解决**: 检查 `vite.config.ts` 的 proxy 配置，确保 Node-RED 在运行

### 问题 2：MQTT 连接失败
**原因**: Mosquitto 未运行或 WebSocket 未启用
**解决**:
```bash
# 检查 Mosquitto 是否运行
docker ps | grep mosquitto

# 查看 Mosquitto 日志
docker logs my-mqtt-broker
```

### 问题 3：设备列表为空
**原因**: Node-RED flows 未部署或 API 路径错误
**解决**:
1. 确认已导入 `flows_corrected.json`
2. 点击 Deploy
3. 检查 Node-RED Debug 面板是否有错误

---

## 目录结构

```
3dRoomV2/
├── components/
│   ├── AuthOverlay.tsx
│   ├── Controls.tsx
│   ├── Interface.tsx
│   └── Room.tsx
├── services/
│   ├── api.ts          # REST API 调用
│   ├── geminiService.ts # AI 服务
│   └── mqtt.ts        # MQTT 客户端
├── App.tsx
├── store.ts           # Zustand 状态管理
├── vite.config.ts     # Vite 配置（含代理）
├── flows.json         # 原始 flows
├── flows_corrected.json # 修正后的 flows
├── docker-compose.yml # Docker 服务配置
└── mosquitto/
    └── config/
        └── mosquitto.conf
```

我来仔细分析这个项目的技术栈和架构。让我先查看关键文件。
根据对代码的详细分析，这是一个**3D 智能家居物联网多用户 AI 房间管理系统**。下面是完整的技术栈介绍：

---

## 📦 项目概览
**名称**: 3D智能虚拟房间  
**核心功能**: 3D 漫游 + IoT 设备控制 + AI 语音指令 + 人脸识别认证

---

## 🎨 前端技术栈

### 核心框架
- **React 19.2.3** - UI 框架
- **TypeScript 5.8.2** - 类型安全开发
- **Vite 6.2.0** - 现代化构建工具，开发服务器端口 3000

### 3D 渲染引擎
- **Three.js 0.182.0** - 底层 3D 图形库
- **@react-three/fiber 9.4.2** - React 的 Three.js 封装
- **@react-three/drei 10.7.7** - 3D 辅助组件库（环境光、星空、纹理加载等）

### 状态管理
- **Zustand 5.0.9** - 轻量级状态管理库

### UI 组件库
- **lucide-react 0.562.0** - 图标库

### 3D 场景特性
- 实时光照系统：环境光、方向光（模拟阳光）、点光源（灯光/投影）
- 物理材质：透明度、反射、粗糙度控制
- 自定义材质：用户可上传地板、墙面、桌面、窗外景色、投影画面贴图
- 第一人称视角控制（WASD 移动 + 鼠标转向）

---

## 🌐 后端架构

### 核心后端服务

#### 1. Node-RED
- **作用**: 可视化流程编排 + REST API 服务
- **端口**: 1880
- **功能**:
  - 设备管理 API（CRUD + 批量更新）
  - 用户认证 API（注册/人脸识别）
  - 与 ThingsBoard 集成的数据中转

#### 2. ThingsBoard
- **作用**: 企业级物联网平台
- **端口**: 8080
- **功能**:
  - 设备数据存储
  - 设备属性管理
  - 可视化仪表板（预留）

#### 3. Mosquitto MQTT Broker
- **作用**: 消息队列 + 实时通信
- **端口**: 1883 (TCP), 9001 (WebSocket)
- **Topics**:
  - `iot/room/devices` - 全局设备状态
  - `iot/room/devices/{device_id}` - 单设备状态

---

## 🔌 技术集成

### MQTT 通信
- **协议**: MQTT 3.1.1 over WebSocket
- **库**: mqtt 5.14.1
- **用途**: 设备状态实时同步

### AI 服务
- **Google Gemini AI 1.34.0**
  - 模型: `gemini-3-flash-preview`
  - 功能: 自然语言解析智能家居指令
  - 输出: 结构化 JSON（设备更新数组）

根据项目当前状态和技术选型（**DeepFace** 人脸识别 + **MediaPipe Gesture Recognizer** 手势识别），我来完善这部分技术说明：

---

## 👤 人脸识别与手势识别

### 技术选型

#### 1. 人脸识别 - DeepFace
- **框架**: Python + DeepFace 库
- **模型**: VGG-Face / FaceNet / ArcFace（可选）
- **部署方式**: Node-RED `exec` 节点调用 Python 脚本
- **功能**:
  - 人脸检测与特征提取
  - 人脸比对与验证
  - 用户注册（存储人脸编码向量）
  - 用户识别（实时比对）

#### 2. 手势识别 - MediaPipe Gesture Recognizer
- **框架**: MediaPipe Python 库
- **模型**: Gesture Recognizer (21 手部关键点 + 手势分类)
- **部署方式**: Node-RED `exec` 节点调用 Python 脚本
- **功能**:
  - 实时手部关键点检测
  - 手势分类（Open_Palm, Closed_Fist, Pointing_Up, Victory, Thumb_Up 等）
  - 手势转 IoT 控制指令（手势控制设备）

---

### 🎯 后端实现方案

#### DeepFace 人脸识别接口

**用户注册流程** (`POST /api/v1/auth/register`):
```
前端发送 { name: "张三", file: base64_image }
    ↓
Node-RED Function 节点：解析 base64，保存图片到 /data/face_images/{user_id}.jpg
    ↓
Node-RED Exec 节点：python /data/register_face.py --image {path} --name {name}
    ↓
Python (DeepFace): 
  1. 检测人脸 → 提取 128 维特征向量
  2. 存储到 /data/face_encodings.json
  3. 返回 { id: "user_001", name: "张三", avatarUrl: "..." }
    ↓
Node-RED Response 节点：返回 JSON 给前端
```

**人脸识别流程** (`POST /api/v1/auth/recognize`):
```
前端发送 { file: base64_image }
    ↓
Node-RED Function 节点：保存临时图片到 /data/temp_scan.jpg
    ↓
Node-RED Exec 节点：python /data/recognize_face.py --image {path}
    ↓
Python (DeepFace):
  1. 读取 /data/face_encodings.json
  2. 对比当前人脸向量与库中所有用户
  3. 返回最相似用户（阈值 > 0.6）
    ↓
Node-RED Response 节点：返回 { id: "user_001", name: "张三", ... } 或 404
```

#### MediaPipe 手势识别接口

**手势控制流程** (`POST /api/v1/gesture/control`):
```
前端发送 { file: base64_image }
    ↓
Node-RED Function 节点：保存到 /data/temp_gesture.jpg
    ↓
Node-RED Exec 节点：python /data/recognize_gesture.py --image {path}
    ↓
Python (MediaPipe):
  1. 检测手部关键点 (21 landmarks)
  2. 分类手势（Open_Palm, Pointing_Up, Victory, etc.）
  3. 映射手势到 IoT 指令
     - 🖐️ Open_Palm → 打开灯光
     - ✊ Closed_Fist → 关闭灯光
     - 👆 Pointing_Up → 指定设备选择
     - ✌️ Victory → 切换窗帘
     - 👍 Thumb_Up → 确认操作
  4. 返回 { gesture: "Open_Palm", action: "turn_on_light", deviceId: "light-main" }
    ↓
Node-RED MQTT Out 节点：发布到 iot/room/devices/{device_id}
    ↓
前端实时更新设备状态
```

---

### 📁 目录结构

```
3dRoomV2/
├── services/
│   └── api.ts                    # 已实现：人脸注册/识别 API 调用
├── components/
│   └── AuthOverlay.tsx            # 已实现：摄像头采集 + 注册/识别 UI
├── backend/                      # (需创建) 后端 Python 服务目录
│   ├── face/
│   │   ├── register_face.py      # DeepFace：人脸注册
│   │   ├── recognize_face.py     # DeepFace：人脸识别
│   │   └── face_encodings.json   # 人脸编码向量存储
│   ├── gesture/
│   │   ├── recognize_gesture.py  # MediaPipe：手势识别
│   │   └── gesture_mapping.json  # 手势 → 设备映射配置
│   └── shared/
│       └── utils.py              # 工具函数（base64 处理等）
├── flows_final.json              # Node-RED 流程配置（需更新）
└── docker-compose.yml            # 需添加 Python 容器服务
```

---

### 🐳 Docker 服务扩展

需要在 `docker-compose.yml` 中添加 **Python 服务容器**：

```yaml
# 4. Python Backend Service (DeepFace + MediaPipe)
python-backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: my-python-backend
  ports:
    - "5000:5000"  # 可选：提供 HTTP API
  volumes:
    - ./backend:/data
    - python-data-volume:/data/.cache  # 缓存模型文件
  restart: always
  depends_on:
    - nodered
```

**Python Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

# 安装依赖
RUN pip install --no-cache-dir \
    deepface==0.0.92 \
    mediapipe==0.10.18 \
    opencv-python==4.9.0.80 \
    flask==3.0.3

WORKDIR /data

CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]
```

---

### 🔗 Node-RED 流程更新

需要在 Node-RED 中新增以下节点流：

#### 人脸注册流程
```
HTTP In (POST /api/v1/auth/register)
    ↓
Function (解析 JSON + Base64 → 保存图片)
    ↓
Exec (python /data/face/register_face.py --image {path} --name {name})
    ↓
Function (格式化返回数据)
    ↓
HTTP Response
```

#### 人脸识别流程
```
HTTP In (POST /api/v1/auth/recognize)
    ↓
Function (解析 JSON + Base64 → 保存临时图片)
    ↓
Exec (python /data/face/recognize_face.py --image {path})
    ↓
Switch (是否匹配成功)
    ↓
HTTP Response (200 或 404)
```

#### 手势控制流程
```
HTTP In (POST /api/v1/gesture/control)
    ↓
Function (解析 JSON + Base64 → 保存临时图片)
    ↓
Exec (python /data/gesture/recognize_gesture.py --image {path})
    ↓
Function (映射手势到 MQTT topic + payload)
    ↓
MQTT Out (iot/room/devices/{device_id})
```

---

### 🎨 前端扩展：手势控制 UI

需要在 `Interface.tsx` 或新增组件 `GestureControls.tsx` 中添加：

```tsx
// 手势识别状态
const [isGestureActive, setIsGestureActive] = useState(false);
const [detectedGesture, setDetectedGesture] = useState<string | null>(null);

// 实时手势识别循环
useEffect(() => {
  if (isGestureActive && videoRef.current) {
    const interval = setInterval(async () => {
      const frame = captureFrame();
      if (frame) {
        const result = await api.recognizeGesture(frame);
        setDetectedGesture(result.gesture);
        if (result.action) {
          // 执行设备控制
          await api.updateDevice(result.deviceId, result.params);
        }
      }
    }, 500); // 每 500ms 检测一次
    return () => clearInterval(interval);
  }
}, [isGestureActive]);
```

---

### 📊 当前完成度

| 模块 | 状态 | 说明 |
|------|------|------|
| 前端 UI（AuthOverlay） | ✅ 完成 | 摄像头采集、注册/识别界面 |
| 前端 API 调用 | ✅ 完成 | `registerUser`, `performFaceRecognition` |
| Node-RED API 接口 | 🟡 部分完成 | 后端接口预留，需添加 DeepFace 调用 |
| Python DeepFace 服务 | ❌ 待实现 | 人脸注册/识别脚本 |
| MediaPipe 手势识别 | ❌ 待实现 | 手势检测 + 设备控制映射 |
| Docker Python 容器 | ❌ 待添加 | 需扩展 docker-compose.yml |
| MQTT 实时同步 | ✅ 完成 | 设备状态通过 MQTT 推送 |

---

### 🚀 下一步开发任务

1. **创建 Python 后端服务目录**：`backend/face/` 和 `backend/gesture/`
2. **编写 DeepFace 注册/识别脚本**
3. **编写 MediaPipe 手势识别脚本**
4. **更新 Node-RED flows**：集成 Python 脚本调用
5. **扩展 Docker Compose**：添加 Python 容器
6. **前端添加手势控制 UI**：实时手势识别反馈
---

## 📂 核心文件说明

| 文件 | 功能 |
|------|------|
| `App.tsx` | 应用入口，初始化 Canvas 和全局效果 |
| `store.ts` | Zustand 全局状态（设备、用户、MQTT、纹理） |
| `types.ts` | TypeScript 类型定义 |
| `components/Room.tsx` | 3D 房间场景渲染（544 行） |
| `components/Interface.tsx` | UI 界面（设备列表、聊天、装修模式） |
| `components/Controls.tsx` | 第一人称相机控制 |
| `components/AuthOverlay.tsx` | 用户认证覆盖层 |
| `services/api.ts` | REST API 调用封装 |
| `services/mqtt.ts` | MQTT 客户端服务封装 |
| `services/geminiService.ts` | AI 语音指令解析 |

---

## 🏠 IoT 设备清单（14 个）

| 设备类型 | 数量 | 功能 |
|----------|------|------|
| 智能吸顶灯 | 1 | 亮度调节 |
| 空调 | 1 | 温度控制 |
| 智能窗帘 | 1 | 开合程度 |
| 升降桌 | 1 | 高度调节 |
| 投影仪 | 1 | 投影画面 |
| 空气净化器 | 1 | 开关状态 |
| 加湿器 | 1 | 开关状态 |
| 扫地机器人 | 1 | 开关 + 路径模拟 |
| 温湿度传感器 | 1 | 环境监测 |
| 摄像头 | 4 | 视频监控 + 聚焦交互 |

---

## 🚀 运行方式

```bash
# 1. 启动 Docker 服务
docker-compose up -d

# 2. 安装依赖
npm install

# 3. 配置环境变量
echo 'GEMINI_API_KEY=your_key' > .env.local

# 4. 启动开发服务器
npm run dev
```

访问: `http://localhost:3000`
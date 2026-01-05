# SmartRoom Django Backend

基于Django + DeepFace + MediaPipe的智能3D房间后端服务，提供用户注册、登录、预设创建和识别功能。

## 功能特性

- ✅ **用户注册**: 使用DeepFace提取人脸特征
- ✅ **用户登录**: 通过人脸识别验证用户身份
- ✅ **预设创建**: 保存用户人脸、手势和设备状态
- ✅ **预设识别**: 通过人脸+手势双重验证识别预设

## 技术栈

- **Web框架**: Django 4.2 + Django REST Framework
- **人脸识别**: DeepFace (VGG-Face)
- **手势识别**: MediaPipe Hands
- **数据库**: SQLite (可切换为MySQL)
- **部署**: Docker + Gunicorn

## 快速开始

### 方式一：使用Docker（推荐）

1. 确保已安装Docker和Docker Compose

2. 构建并启动服务
```bash
cd django-backend
docker-compose up -d --build
```

3. 检查服务状态
```bash
docker-compose logs -f django-backend
```

### 方式二：本地运行

1. 创建Python虚拟环境
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 安装依赖
```bash
pip install -r requirements.txt
```

3. 初始化数据库
```bash
python manage.py makemigrations
python manage.py migrate
```

4. 创建超级管理员（可选）
```bash
python manage.py createsuperuser
```

5. 启动服务
```bash
python manage.py runserver
```

服务将在 `http://localhost:8000` 启动

## API文档

### 基础URL
```
http://localhost:8000/api/v1
```

### 健康检查
```http
GET /health/
```

### 1. 用户注册

注册新用户并提取人脸特征。

```http
POST /auth/register
Content-Type: application/json

{
  "name": "张三",
  "face_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**响应 (201)**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "张三",
  "avatar_url": "data:image/jpeg;base64,...",
  "registered_at": "2026-01-05T10:00:00Z"
}
```

### 2. 用户登录

通过人脸识别登录。

```http
POST /auth/login
Content-Type: application/json

{
  "face_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**响应 (200)**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "张三",
  "avatar_url": "data:image/jpeg;base64,...",
  "confidence": 0.95
}
```

### 3. 创建预设

创建新的预设配置。

```http
POST /presets/create/
Content-Type: application/json

{
  "name": "工作模式",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "face_image": "data:image/jpeg;base64,...",
  "gesture_image": "data:image/jpeg;base64,...",
  "device_states": [
    {
      "device_id": "light-main",
      "status": true,
      "value": 80
    },
    {
      "device_id": "ac",
      "status": true,
      "value": 24
    }
  ]
}
```

**响应 (201)**
```json
{
  "id": "987fcdeb-51a2-43ed-a89c-1eb2e8c7c9f2",
  "name": "工作模式",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_name": "张三",
  "created_at": "2026-01-05T10:00:00Z"
}
```

### 4. 识别预设

通过人脸和手势识别预设。

```http
POST /presets/recognize/
Content-Type: application/json

{
  "face_image": "data:image/jpeg;base64,...",
  "gesture_image": "data:image/jpeg;base64,..."
}
```

**响应 (200)**
```json
{
  "id": "987fcdeb-51a2-43ed-a89c-1eb2e8c7c9f2",
  "name": "工作模式",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_name": "张三",
  "device_states": [
    {
      "device_id": "light-main",
      "status": true,
      "value": 80
    },
    {
      "device_id": "ac",
      "status": true,
      "value": 24
    }
  ],
  "confidence": 0.92
}
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DEBUG` | `True` | 调试模式 |
| `DJANGO_SECRET_KEY` | - | Django密钥 |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | 允许的主机 |
| `CORS_ALLOWED_ORIGINS` | - | 允许的跨域来源 |
| `DEEPFACE_MODEL` | `VGG-Face` | DeepFace模型 |
| `DEEPFACE_DISTANCE_METRIC` | `cosine` | 距离度量方式 |
| `FACE_RECOGNITION_THRESHOLD` | `0.4` | 人脸识别阈值 |
| `MAX_HANDS` | `2` | 最大手势数量 |
| `MIN_DETECTION_CONFIDENCE` | `0.5` | 最小检测置信度 |
| `MIN_TRACKING_CONFIDENCE` | `0.5` | 最小跟踪置信度 |

## 管理后台

访问管理后台：`http://localhost:8000/admin/`

使用超级管理员账号登录，可以管理用户和预设数据。

## 项目结构

```
django-backend/
├── config/              # Django配置
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── smartroom/           # 核心应用
│   ├── models.py        # 数据模型
│   ├── serializers.py   # API序列化器
│   ├── views.py         # API视图
│   ├── urls.py          # 路由配置
│   ├── services/        # AI服务
│   │   ├── face_service.py      # DeepFace封装
│   │   └── gesture_service.py   # MediaPipe封装
│   └── utils/           # 工具函数
│       └── image_utils.py       # 图片处理
├── media/               # 媒体文件存储
├── manage.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## 测试

使用curl测试API：

```bash
# 健康检查
curl http://localhost:8000/api/v1/health/

# 用户注册
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","face_image":"data:image/jpeg;base64,..."}'

# 用户登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"face_image":"data:image/jpeg;base64,..."}'
```

## 故障排查

### 模型加载慢
DeepFace首次加载模型需要时间，约30-60秒。

### 人脸识别失败
- 确保图片中包含清晰的人脸
- 光线充足
- 检查图片格式是否正确

### 手势识别失败
- 确保图片中包含清晰的手部
- 手部完整可见
- 检查手势编码是否正确保存

## 性能优化建议

1. **模型预加载**: DeepFace模型在首次使用时加载，建议在应用启动时预加载
2. **特征缓存**: 将人脸和手势特征向量缓存到内存中
3. **异步处理**: 使用Celery处理耗时的AI识别任务
4. **数据库优化**: 为特征向量字段创建索引

## 许可证

MIT License

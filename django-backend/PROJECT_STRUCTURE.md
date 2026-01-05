# Django Backend 项目结构说明

```
django-backend/
│
├── config/                      # Django项目配置
│   ├── __init__.py
│   ├── settings.py              # 项目设置（数据库、中间件、CORS等）
│   ├── urls.py                 # 根URL路由配置
│   ├── wsgi.py                 # WSGI应用入口
│   └── asgi.py                 # ASGI应用入口
│
├── smartroom/                  # 核心应用（智能房间业务逻辑）
│   ├── __init__.py
│   ├── apps.py                 # 应用配置
│   ├── models.py               # 数据模型（User, Preset）
│   ├── serializers.py          # DRF序列化器
│   ├── views.py                # API视图（4个核心接口）
│   ├── urls.py                 # 应用URL路由
│   ├── admin.py                # Django管理后台配置
│   ├── exceptions.py           # 自定义异常
│   ├── migrations/             # 数据库迁移文件
│   │   └── __init__.py
│   ├── services/              # AI服务封装
│   │   ├── __init__.py
│   │   ├── face_service.py     # DeepFace人脸识别服务
│   │   └── gesture_service.py  # MediaPipe手势识别服务
│   └── utils/                 # 工具函数
│       ├── __init__.py
│       └── image_utils.py      # 图片处理工具（Base64转换）
│
├── media/                      # 媒体文件存储目录
│   └── .gitkeep
│
├── scripts/                    # 脚本工具
│   ├── init.sh                # Linux/Mac初始化脚本
│   └── init.ps1               # Windows初始化脚本
│
├── Dockerfile                  # Docker镜像构建文件
├── docker-compose.yml          # Docker Compose配置
├── manage.py                  # Django管理命令
├── requirements.txt           # Python依赖包
├── .gitignore                 # Git忽略文件
│
├── README.md                  # 详细文档
├── QUICKSTART.md             # 快速启动指南
├── PROJECT_STRUCTURE.md       # 本文件
│
├── start.sh                  # Linux/Mac启动脚本
├── start.ps1                 # Windows启动脚本
├── test-api.sh              # API测试脚本（Linux/Mac）
└── test_local.py            # 本地测试脚本
```

## 📁 核心目录说明

### config/ - 项目配置
- `settings.py`: 包含所有Django设置
  - 数据库配置（SQLite）
  - REST Framework配置
  - CORS跨域配置
  - DeepFace和MediaPipe参数
  - 日志配置

### smartroom/ - 核心应用
- `models.py`: 数据模型定义
  - `User`: 用户模型（存储人脸特征）
  - `Preset`: 预设模型（存储人脸+手势+设备状态）

- `views.py`: API视图实现
  - `UserRegistrationView`: 用户注册
  - `UserLoginView`: 用户登录（人脸识别）
  - `PresetCreateView`: 创建预设
  - `PresetRecognizeView`: 识别预设（人脸+手势）
  - `HealthCheckView`: 健康检查

- `services/`: AI服务封装
  - `face_service.py`: DeepFace封装
    - `extract_face_features()`: 提取人脸特征
    - `verify_faces()`: 验证两张人脸
    - `find_matching_face()`: 在数据库中查找人脸
  - `gesture_service.py`: MediaPipe封装
    - `extract_gesture_features()`: 提取手势特征（21个关键点）
    - `match_gesture()`: 匹配两个手势
    - `find_matching_gesture()`: 在数据库中查找手势

- `utils/`: 工具函数
  - `image_utils.py`: 图片处理
    - `base64_to_image()`: Base64转OpenCV图像
    - `image_to_base64()`: OpenCV图像转Base64
    - `validate_image_size()`: 验证图片大小

## 🔌 API接口总览

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/health/` | GET | 健康检查 |
| `/api/v1/auth/register/` | POST | 用户注册 |
| `/api/v1/auth/login/` | POST | 用户登录 |
| `/api/v1/presets/create/` | POST | 创建预设 |
| `/api/v1/presets/recognize/` | POST | 识别预设 |
| `/admin/` | GET | Django管理后台 |

## 📊 数据流程

### 用户注册流程
```
前端 → /api/v1/auth/register/
  ↓
views.UserRegistrationView.post()
  ↓
image_utils.base64_to_image()  # 转换图片
  ↓
services.face_service.extract_face_features()  # 提取人脸特征
  ↓
models.User.objects.create()  # 保存用户
  ↓
返回用户信息
```

### 用户登录流程
```
前端 → /api/v1/auth/login/
  ↓
views.UserLoginView.post()
  ↓
image_utils.base64_to_image()  # 转换图片
  ↓
services.face_service.find_matching_face()  # 匹配人脸
  ↓
更新last_login时间
  ↓
返回用户信息 + 置信度
```

### 创建预设流程
```
前端 → /api/v1/presets/create/
  ↓
views.PresetCreateView.post()
  ↓
获取用户 → 验证权限
  ↓
image_utils.base64_to_image()  # 转换图片
  ↓
services.face_service.extract_face_features()  # 提取人脸
  ↓
services.gesture_service.extract_gesture_features()  # 提取手势
  ↓
models.Preset.objects.create()  # 保存预设
  ↓
返回预设信息
```

### 识别预设流程
```
前端 → /api/v1/presets/recognize/
  ↓
views.PresetRecognizeView.post()
  ↓
services.face_service.find_matching_face()  # 步骤1: 识别人脸
  ↓
获取该用户的所有预设
  ↓
services.gesture_service.find_matching_gesture()  # 步骤2: 匹配手势
  ↓
更新last_used时间
  ↓
返回预设信息 + 设备状态
```

## 🔧 配置说明

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEBUG` | `True` | 调试模式 |
| `DJANGO_SECRET_KEY` | - | Django密钥 |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,0.0.0.0` | 允许的主机 |
| `CORS_ALLOWED_ORIGINS` | - | 跨域来源 |
| `DEEPFACE_MODEL` | `VGG-Face` | DeepFace模型 |
| `DEEPFACE_DISTANCE_METRIC` | `cosine` | 距离度量 |
| `FACE_RECOGNITION_THRESHOLD` | `0.4` | 人脸识别阈值 |
| `MAX_HANDS` | `2` | 最大手势数 |
| `MIN_DETECTION_CONFIDENCE` | `0.5` | 最小检测置信度 |

### DeepFace模型选择

可选模型:
- `VGG-Face` (默认): 准确率高，速度快
- `Facenet`: 轻量级，适合边缘设备
- `Facenet512`: 更高准确率
- `ArcFace`: 最新模型，性能最佳

### MediaPipe配置

- `max_num_hands`: 同时识别的手数
- `min_detection_confidence`: 检测置信度阈值
- `min_tracking_confidence`: 跟踪置信度阈值

## 🚀 部署架构

```
┌─────────────┐
│   前端      │ (React + Three.js)
│  :3000      │
└──────┬──────┘
       │ HTTP
┌──────▼──────┐
│  Nginx      │ (反向代理，生产环境)
│  (可选)     │
└──────┬──────┘
       │
┌──────▼──────┐
│  Django     │
│  Backend    │ (:8000)
│  ┌────────┐ │
│  │ Gunicorn│ │
│  │ 2进程   │ │
│  └────────┘ │
│  ┌────────┐ │
│  │DeepFace│ │ 人脸识别
│  │MediaPipe│ │ 手势识别
│  └────────┘ │
└──────┬──────┘
       │
┌──────▼──────┐
│  SQLite     │ (可切换到PostgreSQL/MySQL)
└─────────────┘
```

## 📈 性能优化建议

1. **模型预加载**: 应用启动时预加载DeepFace和MediaPipe模型
2. **特征缓存**: 将用户和预设的特征向量缓存到Redis
3. **异步处理**: 使用Celery处理耗时的AI识别任务
4. **数据库优化**: 为特征向量字段创建索引
5. **图片压缩**: 在前端压缩图片后再上传

## 🔐 安全建议

1. **HTTPS**: 生产环境必须使用HTTPS
2. **密钥管理**: 使用环境变量管理敏感信息
3. **图片验证**: 严格限制上传图片大小和格式
4. **速率限制**: 已配置DRF的Throttle类
5. **日志审计**: 记录所有API访问日志
6. **数据加密**: 考虑对人脸特征向量加密存储

## 🧪 测试策略

- 单元测试: 测试各个服务函数
- 集成测试: 测试API接口
- 端到端测试: 测试完整业务流程
- 性能测试: 测试并发请求处理能力

## 📝 开发规范

- 遵循PEP 8代码风格
- 使用类型注解
- 编写docstring文档
- Git提交前运行linting
- 代码审查流程

## 📚 参考资料

- [Django官方文档](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [DeepFace文档](https://github.com/serengil/deepface)
- [MediaPipe文档](https://google.github.io/mediapipe/)
- [Docker最佳实践](https://docs.docker.com/develop/dev-best-practices/)

# Django Backend 快速启动指南

## 🚀 快速开始

### Windows用户

```powershell
# 方式1: 使用PowerShell脚本
cd django-backend
.\start.ps1

# 方式2: 手动启动
docker-compose up -d --build django-backend

# 初始化数据库
.\scripts\init.ps1
```

### Linux/Mac用户

```bash
# 方式1: 使用Shell脚本
cd django-backend
chmod +x start.sh
./start.sh

# 方式2: 手动启动
docker-compose up -d --build django-backend

# 初始化数据库
chmod +x scripts/init.sh
./scripts/init.sh
```

## 📋 验证安装

### 1. 健康检查

```bash
curl http://localhost:8000/api/v1/health/
```

预期响应:
```json
{
  "status": "healthy",
  "service": "SmartRoom Django Backend",
  "version": "1.0.0"
}
```

### 2. 查看日志

```bash
docker-compose logs -f django-backend
```

### 3. 访问管理后台

浏览器访问: http://localhost:8000/admin/

首次使用需要创建超级管理员:

```bash
docker-compose exec django-backend python manage.py createsuperuser
```

## 🧪 测试API

### 使用Postman或curl测试

#### 1. 用户注册

```bash
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试用户",
    "face_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

#### 2. 用户登录

```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "face_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

#### 3. 创建预设

```bash
curl -X POST http://localhost:8000/api/v1/presets/create/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "工作模式",
    "user_id": "uuid-here",
    "face_image": "data:image/jpeg;base64,...",
    "gesture_image": "data:image/jpeg;base64,...",
    "device_states": [
      {"device_id": "light-main", "status": true, "value": 80},
      {"device_id": "ac", "status": true, "value": 24}
    ]
  }'
```

#### 4. 识别预设

```bash
curl -X POST http://localhost:8000/api/v1/presets/recognize/ \
  -H "Content-Type: application/json" \
  -d '{
    "face_image": "data:image/jpeg;base64,...",
    "gesture_image": "data:image/jpeg;base64,..."
  }'
```

## 🔧 常见问题

### 模型加载慢

DeepFace首次加载模型需要30-60秒，这是正常的。

### 端口冲突

如果8000端口被占用，修改`docker-compose.yml`中的端口映射:

```yaml
ports:
  - "8001:8000"  # 使用8001端口
```

### 数据库错误

删除并重新创建数据库:

```bash
docker-compose down -v
docker-compose up -d --build django-backend
./scripts/init.sh  # 或 .\scripts\init.ps1
```

### 查看详细日志

```bash
# 查看实时日志
docker-compose logs -f django-backend

# 查看最近100行日志
docker-compose logs --tail=100 django-backend
```

## 📊 监控

### 资源使用

```bash
docker stats smartroom-django-backend
```

### 健康检查

```bash
# 手动健康检查
curl http://localhost:8000/api/v1/health/

# 查看Docker健康状态
docker inspect --format='{{.State.Health.Status}}' smartroom-django-backend
```

## 🔐 生产环境部署

### 1. 修改配置

编辑`docker-compose.yml`:

```yaml
environment:
  - DEBUG=False
  - DJANGO_SECRET_KEY=your-secret-key-here
  - ALLOWED_HOSTS=your-domain.com
```

### 2. 使用HTTPS

配置反向代理 (Nginx/Apache) 提供HTTPS支持。

### 3. 数据库

切换到PostgreSQL或MySQL:

```python
# config/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'smartroom',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'db',
        'PORT': '5432',
    }
}
```

## 📚 更多信息

- [完整API文档](README.md)
- [Django官方文档](https://docs.djangoproject.com/)
- [DeepFace文档](https://github.com/serengil/deepface)
- [MediaPipe文档](https://google.github.io/mediapipe/)

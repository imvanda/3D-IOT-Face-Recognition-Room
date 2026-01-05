# Django Backend 集成修改总结

## 📝 修改内容

### 1. Django Backend - MySQL数据库支持 ✅

#### 修改的文件：
- `django-backend/config/settings.py`
- `django-backend/requirements.txt`
- `django-backend/Dockerfile`
- `mysql/init.sql` (新建)
- `docker-compose.yml`

#### 主要变更：
- **数据库配置**: 支持MySQL和SQLite双模式
  ```python
  DB_ENGINE = os.environ.get('DB_ENGINE', 'mysql')
  DB_HOST = os.environ.get('DB_HOST', 'mysql')
  DB_PORT = os.environ.get('DB_PORT', '3306')
  DB_NAME = os.environ.get('DB_NAME', 'smartroom')
  DB_USER = os.environ.get('DB_USER', 'root')
  DB_PASSWORD = os.environ.get('DB_PASSWORD', '1234')
  ```

- **新增MySQL服务**:
  ```yaml
  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=1234
      - MYSQL_DATABASE=smartroom
    volumes:
      - mysql-data:/var/lib/mysql
  ```

- **系统依赖**: 添加`default-libmysqlclient-dev`和`build-essential`
- **Python依赖**: 添加`mysqlclient==2.2.4`

### 2. 前端 API 调用修改 ✅

#### 修改的文件：
- `services/api.ts`
- `components/Interface.tsx`

#### 主要变更：

##### services/api.ts

1. **用户注册** - 改为调用Django API
   ```typescript
   // 从: API_BASE_URL + '/auth/register'
   // 到: DJANGO_API_BASE_URL + '/auth/register/'
   ```

2. **用户登录** - 改为调用Django API
   ```typescript
   // 从: API_BASE_URL + '/auth/recognize'
   // 到: DJANGO_API_BASE_URL + '/auth/login/'
   ```

3. **保存预设** - 修改端点和参数
   ```typescript
   // 端点: /presets/create/
   // 参数: user_id, name, face_image, gesture_image, device_states
   ```

4. **识别预设** - 保持不变
   ```typescript
   // 端点: /presets/recognize/
   // 参数: face_image, gesture_image
   ```

##### components/Interface.tsx

**handleSavePreset函数**:
- 添加用户登录检查
- 传递`user_id`参数
- 格式化设备状态（deviceId → device_id）

## 🔧 配置说明

### 数据库连接信息

| 配置项 | 值 | 说明 |
|---------|-----|------|
| **DB_ENGINE** | mysql | 数据库引擎 |
| **DB_HOST** | mysql | MySQL容器名 |
| **DB_PORT** | 3306 | MySQL端口 |
| **DB_NAME** | smartroom | 数据库名 |
| **DB_USER** | root | 用户名 |
| **DB_PASSWORD** | 1234 | 密码 |

### 环境变量优先级

1. Docker Compose环境变量（最高优先级）
2. `.env`文件
3. settings.py默认值（最低优先级）

## 🚀 启动方式

### 完整启动（所有服务）

```powershell
cd D:\Codespaces\working\Iot-MutiUser-AI-Room\3dRoomV2
docker-compose up -d --build
```

### 仅启动Django Backend

```powershell
cd D:\Codespaces\working\Iot-MutiUser-AI-Room\3dRoomV2\django-backend
docker-compose up -d --build
```

## 📊 服务架构

```
┌─────────────────────────────────────────┐
│           Docker Compose             │
├─────────────────────────────────────────┤
│ ThingsBoard (8080)               │
│ Node-RED (1880)                  │
│ Mosquitto (1884/9001)             │
│ Django Backend (8000)  ← MySQL    │
│ MySQL (3306)                      │
└─────────────────────────────────────────┘
```

## 🔌 API端点对照表

| 功能 | 旧端点 | 新端点 | 服务 |
|------|---------|---------|------|
| 用户注册 | `/api/v1/auth/register` | `/api/v1/auth/register/` | Django |
| 用户登录 | `/api/v1/auth/recognize` | `/api/v1/auth/login/` | Django |
| 保存预设 | `/api/v1/presets/` | `/api/v1/presets/create/` | Django |
| 识别预设 | `/api/v1/presets/recognize/` | `/api/v1/presets/recognize/` | Django |
| 设备控制 | `/api/v1/devices/*` | `/api/v1/devices/*` | Node-RED |

## ✅ 验证步骤

### 1. 检查所有服务

```powershell
# 查看所有容器
docker-compose ps

# 应该看到5个服务：
# - my-tb-platform (ThingsBoard)
# - my-node-red (Node-RED)
# - my-mqtt-broker (Mosquitto)
# - smartroom-django-backend (Django)
# - smartroom-mysql (MySQL)
```

### 2. 测试Django健康检查

```powershell
curl http://localhost:8000/api/v1/health/

# 预期响应:
# {"status":"healthy","service":"SmartRoom Django Backend","version":"1.0.0"}
```

### 3. 初始化数据库

```powershell
# 运行迁移
docker-compose exec django-backend python manage.py migrate

# 验证表已创建
docker-compose exec mysql mysql -uroot -p1234 -e "SHOW TABLES FROM smartroom;"
```

### 4. 测试前端集成

1. 打开前端: http://localhost:5173
2. 点击"注册用户"
3. 输入用户名并拍摄人脸
4. 点击"识别"进行登录
5. 创建并应用预设

## 🐛 故障排查

### MySQL连接失败

**问题**: `Can't connect to MySQL server`

**解决方案**:
```powershell
# 检查MySQL容器状态
docker logs smartroom-mysql

# 检查网络连接
docker network inspect iot-network

# 确认环境变量
docker exec smartroom-django-backend env | grep DB_
```

### 数据库表不存在

**问题**: `Table 'smartroom.users' doesn't exist`

**解决方案**:
```powershell
# 运行Django迁移
docker-compose exec django-backend python manage.py makemigrations smartroom
docker-compose exec django-backend python manage.py migrate
```

### 前端API调用失败

**问题**: `Network Error` 或 `404 Not Found`

**解决方案**:
```powershell
# 检查Django服务是否正常
curl http://localhost:8000/api/v1/health/

# 检查CORS配置
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:8000/api/v1/auth/register/

# 查看Django日志
docker logs smartroom-django-backend
```

## 📝 数据库表结构

### users表
```sql
- id (CHAR(32), PRIMARY KEY)
- name (VARCHAR(100))
- face_image (TEXT)
- face_encoding (JSON)
- avatar_url (TEXT)
- registered_at (DATETIME)
- last_login (DATETIME)
```

### presets表
```sql
- id (CHAR(32), PRIMARY KEY)
- name (VARCHAR(100))
- user_id (CHAR(32), FOREIGN KEY -> users.id)
- face_image (TEXT)
- gesture_image (TEXT)
- gesture_encoding (JSON)
- device_states (JSON)
- created_at (DATETIME)
- updated_at (DATETIME)
- last_used (DATETIME)
```

## 🔄 迁移说明

### 从SQLite迁移到MySQL

1. 导出SQLite数据
2. 修改配置使用MySQL
3. 创建MySQL数据库
4. 运行迁移
5. 导入数据

## 📚 相关文档

- [Django Backend README](./django-backend/README.md)
- [Django Backend Quickstart](./django-backend/QUICKSTART.md)
- [Django Backend Project Structure](./django-backend/PROJECT_STRUCTURE.md)
- [项目主README](./README.md)

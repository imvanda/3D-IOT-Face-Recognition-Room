#!/bin/bash

# Django Backend 快速启动脚本

echo "🚀 启动 Django Backend..."

# 构建并启动服务
docker-compose up -d --build django-backend

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 健康检查
echo "🔍 健康检查..."
curl -f http://localhost:8000/api/v1/health/ || {
    echo "❌ 服务启动失败，请查看日志"
    docker-compose logs django-backend
    exit 1
}

echo "✅ Django Backend 启动成功！"
echo "📍 API地址: http://localhost:8000/api/v1"
echo "📖 管理后台: http://localhost:8000/admin"
echo "📊 查看日志: docker-compose logs -f django-backend"

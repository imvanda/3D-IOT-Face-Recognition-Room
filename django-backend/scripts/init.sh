#!/bin/bash

# Django Backend 初始化脚本

echo "🚀 初始化 Django Backend..."

# 等待Django服务启动
echo "⏳ 等待Django服务启动..."
sleep 10

# 运行数据库迁移
echo "📦 运行数据库迁移..."
docker-compose exec -T django-backend python manage.py makemigrations smartroom
docker-compose exec -T django-backend python manage.py migrate

echo "✅ 初始化完成！"

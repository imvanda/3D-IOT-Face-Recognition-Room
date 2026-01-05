# Django Backend 初始化脚本 (Windows PowerShell)

Write-Host "🚀 初始化 Django Backend..." -ForegroundColor Green

# 等待Django服务启动
Write-Host "⏳ 等待Django服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 运行数据库迁移
Write-Host "📦 运行数据库迁移..." -ForegroundColor Yellow
docker-compose exec -T django-backend python manage.py makemigrations smartroom
docker-compose exec -T django-backend python manage.py migrate

Write-Host "✅ 初始化完成！" -ForegroundColor Green

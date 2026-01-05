# Django Backend 快速启动脚本 (Windows PowerShell)

Write-Host "🚀 启动 Django Backend..." -ForegroundColor Green

# 构建并启动服务
docker-compose up -d --build django-backend

# 等待服务启动
Write-Host "⏳ 等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 健康检查
Write-Host "🔍 健康检查..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health/" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Django Backend 启动成功！" -ForegroundColor Green
        Write-Host "📍 API地址: http://localhost:8000/api/v1" -ForegroundColor Cyan
        Write-Host "📖 管理后台: http://localhost:8000/admin" -ForegroundColor Cyan
        Write-Host "📊 查看日志: docker-compose logs -f django-backend" -ForegroundColor Cyan
    } else {
        throw "服务响应异常"
    }
} catch {
    Write-Host "❌ 服务启动失败，请查看日志" -ForegroundColor Red
    docker-compose logs django-backend
    exit 1
}

#!/bin/bash

# Django Backend API 测试脚本

BASE_URL="http://localhost:8000/api/v1"

echo "🧪 测试 Django Backend API"
echo "=========================="

# 1. 健康检查
echo ""
echo "1️⃣  健康检查..."
curl -s $BASE_URL/health/ | jq '.'

# 2. 用户注册 (需要提供Base64图片)
echo ""
echo "2️⃣  用户注册 (请提供Base64图片数据)..."
# 示例:
# curl -X POST $BASE_URL/auth/register/ \
#   -H "Content-Type: application/json" \
#   -d '{"name":"张三","face_image":"data:image/jpeg;base64,..."}' | jq '.'

echo "   (请手动测试注册功能)"

# 3. 用户登录
echo ""
echo "3️⃣  用户登录..."
# 示例:
# curl -X POST $BASE_URL/auth/login/ \
#   -H "Content-Type: application/json" \
#   -d '{"face_image":"data:image/jpeg;base64,..."}' | jq '.'

echo "   (请手动测试登录功能)"

# 4. 创建预设
echo ""
echo "4️⃣  创建预设..."
# 示例:
# curl -X POST $BASE_URL/presets/create/ \
#   -H "Content-Type: application/json" \
#   -d '{
#     "name":"工作模式",
#     "user_id":"user-uuid",
#     "face_image":"data:image/jpeg;base64,...",
#     "gesture_image":"data:image/jpeg;base64,...",
#     "device_states":[{"device_id":"light-main","status":true,"value":80}]
#   }' | jq '.'

echo "   (请手动测试创建预设功能)"

# 5. 识别预设
echo ""
echo "5️⃣  识别预设..."
# 示例:
# curl -X POST $BASE_URL/presets/recognize/ \
#   -H "Content-Type: application/json" \
#   -d '{
#     "face_image":"data:image/jpeg;base64,...",
#     "gesture_image":"data:image/jpeg;base64,..."
#   }' | jq '.'

echo "   (请手动测试识别预设功能)"

echo ""
echo "✅ 测试完成！"

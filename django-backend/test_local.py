#!/usr/bin/env python3
"""
本地测试脚本 - 在本地环境中测试Django API（不使用Docker）
"""

import os
import sys
import django
import base64
import json
import requests
from pathlib import Path

# 设置Django环境
sys.path.insert(0, str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# 配置Django
django.setup()

from django.core.management import call_command
from smartroom.services.face_service import extract_face_features, find_matching_face
from smartroom.services.gesture_service import extract_gesture_features
from smartroom.utils.image_utils import base64_to_image
from smartroom.models import User, Preset
import cv2
import numpy as np

BASE_URL = "http://localhost:8000/api/v1"


def create_test_image():
    """创建一个测试用的纯色图片（用于测试）"""
    # 创建一个100x100的黑色图片
    img = np.zeros((100, 100, 3), dtype=np.uint8)

    # 转换为Base64
    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{img_base64}"


def test_health_check():
    """测试健康检查接口"""
    print("\n" + "="*50)
    print("1️⃣  测试健康检查...")
    print("="*50)

    try:
        response = requests.get(f"{BASE_URL}/health/", timeout=5)
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False


def test_user_register():
    """测试用户注册接口"""
    print("\n" + "="*50)
    print("2️⃣  测试用户注册...")
    print("="*50)

    try:
        # 注意: 实际使用时需要提供真实的人脸图片
        print("⚠️  注意: 需要提供真实的人脸图片才能成功注册")
        print("示例代码:")

        test_data = {
            "name": "测试用户",
            "face_image": create_test_image()  # 这个不会识别出人脸
        }

        print(f"请求数据: {json.dumps({'name': test_data['name'], 'face_image': 'data:image/jpeg;base64,...'}, indent=2)}")

        response = requests.post(
            f"{BASE_URL}/auth/register/",
            json=test_data,
            timeout=30
        )

        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

        return response.status_code == 201

    except Exception as e:
        print(f"❌ 错误: {e}")
        return False


def test_user_login():
    """测试用户登录接口"""
    print("\n" + "="*50)
    print("3️⃣  测试用户登录...")
    print("="*50)

    try:
        # 注意: 实际使用时需要提供真实的人脸图片
        print("⚠️  注意: 需要提供真实的人脸图片才能成功登录")

        test_data = {
            "face_image": create_test_image()  # 这个不会识别出人脸
        }

        print(f"请求数据: {json.dumps({'face_image': 'data:image/jpeg;base64,...'}, indent=2)}")

        response = requests.post(
            f"{BASE_URL}/auth/login/",
            json=test_data,
            timeout=30
        )

        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

        return response.status_code == 200

    except Exception as e:
        print(f"❌ 错误: {e}")
        return False


def test_preset_create():
    """测试创建预设接口"""
    print("\n" + "="*50)
    print("4️⃣  测试创建预设...")
    print("="*50)

    try:
        # 注意: 需要先有用户
        print("⚠️  注意: 需要先注册用户才能创建预设")
        print("示例代码:")

        test_data = {
            "name": "工作模式",
            "user_id": "uuid-here",
            "face_image": create_test_image(),
            "gesture_image": create_test_image(),
            "device_states": [
                {"device_id": "light-main", "status": True, "value": 80},
                {"device_id": "ac", "status": True, "value": 24}
            ]
        }

        print(f"请求数据: {json.dumps({k: v if 'image' not in k else 'data:image/jpeg;base64,...' for k, v in test_data.items()}, indent=2)}")

        response = requests.post(
            f"{BASE_URL}/presets/create/",
            json=test_data,
            timeout=30
        )

        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

        return response.status_code == 201

    except Exception as e:
        print(f"❌ 错误: {e}")
        return False


def test_preset_recognize():
    """测试识别预设接口"""
    print("\n" + "="*50)
    print("5️⃣  测试识别预设...")
    print("="*50)

    try:
        print("⚠️  注意: 需要先有用户和预设才能识别")
        print("示例代码:")

        test_data = {
            "face_image": create_test_image(),
            "gesture_image": create_test_image()
        }

        print(f"请求数据: {json.dumps({'face_image': 'data:image/jpeg;base64,...', 'gesture_image': 'data:image/jpeg;base64,...'}, indent=2)}")

        response = requests.post(
            f"{BASE_URL}/presets/recognize/",
            json=test_data,
            timeout=30
        )

        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

        return response.status_code == 200

    except Exception as e:
        print(f"❌ 错误: {e}")
        return False


def print_summary(results):
    """打印测试总结"""
    print("\n" + "="*50)
    print("📊 测试总结")
    print("="*50)

    total = len(results)
    passed = sum(results.values())

    print(f"总测试数: {total}")
    print(f"通过: {passed} ✅")
    print(f"失败: {total - passed} ❌")

    if passed == total:
        print("\n🎉 所有测试通过!")
    else:
        print("\n⚠️  部分测试失败，请检查日志")

    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name}: {status}")


def main():
    """主函数"""
    print("🧪 Django Backend API 测试")
    print("="*50)
    print(f"基础URL: {BASE_URL}")
    print("="*50)

    # 运行所有测试
    results = {
        "健康检查": test_health_check(),
        "用户注册": test_user_register(),
        "用户登录": test_user_login(),
        "创建预设": test_preset_create(),
        "识别预设": test_preset_recognize()
    }

    # 打印总结
    print_summary(results)


if __name__ == "__main__":
    main()

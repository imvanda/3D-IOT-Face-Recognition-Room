"""
API Views for SmartRoom application.
"""
import uuid
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db.models import Q
import logging

from .models import User, Preset
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    PresetSerializer,
    PresetRecognizeSerializer,
    PresetResultSerializer
)
from .services.face_service import extract_face_features, find_matching_face
from .services.gesture_service import extract_gesture_features, find_matching_gesture
from .utils.image_utils import base64_to_image, validate_image_size
from .exceptions import (
    FaceRecognitionError,
    GestureRecognitionError,
    InvalidImageError,
    UserNotFoundError,
    PresetNotFoundError
)

logger = logging.getLogger(__name__)


class UserRegistrationView(APIView):
    """用户注册视图"""

    permission_classes = [AllowAny]

    def post(self, request):
        """
        用户注册 - 提取人脸特征并保存用户信息

        POST /api/v1/auth/register
        {
            "name": "张三",
            "face_image": "data:image/jpeg;base64,..."
        }
        """
        serializer = UserRegistrationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                'message': '请求数据无效',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 验证图片大小
            face_image = serializer.validated_data['face_image']
            if not validate_image_size(face_image):
                return Response({
                    'message': '图片大小超过限制（最大5MB）'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 转换图片
            image_array = base64_to_image(face_image)

            # 提取人脸特征
            logger.info(f"正在为用户 {serializer.validated_data['name']} 提取人脸特征...")
            face_result = extract_face_features(image_array)

            if not face_result['face_detected']:
                return Response({
                    'message': '未检测到人脸，请确保图片中包含清晰的人脸'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 创建用户
            user = User.objects.create(
                name=serializer.validated_data['name'],
                face_image=face_image,
                face_encoding=face_result['embedding'],
                avatar_url=face_image  # 使用注册时的图片作为头像
            )

            logger.info(f"用户注册成功: {user.name} (ID: {user.id})")

            # 返回用户信息
            response_data = {
                'id': str(user.id),
                'name': user.name,
                'avatar_url': user.avatar_url,
                'registered_at': user.registered_at.isoformat()
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except (FaceRecognitionError, InvalidImageError) as e:
            logger.error(f"用户注册失败: {str(e)}")
            return Response({
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"用户注册失败: {str(e)}")
            return Response({
                'message': '服务器内部错误'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserLoginView(APIView):
    """用户登录视图"""

    permission_classes = [AllowAny]

    def post(self, request):
        """
        用户登录 - 通过人脸识别登录

        POST /api/v1/auth/login
        {
            "face_image": "data:image/jpeg;base64,..."
        }
        """
        serializer = UserLoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                'message': '请求数据无效',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 验证图片大小
            face_image = serializer.validated_data['face_image']
            if not validate_image_size(face_image):
                return Response({
                    'message': '图片大小超过限制（最大5MB）'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 转换图片
            image_array = base64_to_image(face_image)

            # 获取数据库中所有用户
            users = User.objects.all()

            if not users.exists():
                return Response({
                    'message': '系统中暂无用户，请先注册'
                }, status=status.HTTP_404_NOT_FOUND)

            # 准备用户特征列表
            db_embeddings = []
            for user in users:
                db_embeddings.append({
                    'user_id': str(user.id),
                    'name': user.name,
                    'embedding': user.face_encoding,
                    'face_image': user.face_image
                })

            # 查找匹配的用户
            logger.info("正在进行人脸识别登录...")
            match_result = find_matching_face(image_array, db_embeddings)

            # 更新最后登录时间
            user = User.objects.get(id=match_result['user_id'])
            user.last_login = timezone.now()
            user.save()

            logger.info(f"用户登录成功: {user.name} (ID: {user.id}), 置信度: {match_result['confidence']:.2f}")

            # 返回用户信息
            response_data = {
                'id': str(user.id),
                'name': user.name,
                'avatar_url': user.avatar_url,
                'confidence': round(match_result['confidence'], 2)
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except UserNotFoundError as e:
            logger.warning(f"登录失败: {str(e)}")
            return Response({
                'message': '未识别到用户'
            }, status=status.HTTP_404_NOT_FOUND)

        except (FaceRecognitionError, InvalidImageError) as e:
            logger.error(f"登录失败: {str(e)}")
            return Response({
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"登录失败: {str(e)}")
            return Response({
                'message': '服务器内部错误'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PresetListView(APIView):
    """预设列表视图"""

    permission_classes = [AllowAny]

    def get(self, request):
        """获取所有预设"""
        presets = Preset.objects.select_related('user').all()
        serializer = PresetSerializer(presets, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PresetCreateView(APIView):
    """预设创建视图"""

    permission_classes = [AllowAny]

    def post(self, request):
        """
        创建预设 - 保存用户人脸、手势和设备状态

        POST /api/v1/presets/
        {
            "name": "工作模式",
            "user_id": "uuid",
            "face_image": "data:image/jpeg;base64,...",
            "gesture_image": "data:image/jpeg;base64,...",
            "device_states": [
                {"device_id": "light-main", "status": true, "value": 80},
                {"device_id": "ac", "status": true, "value": 24}
            ]
        }
        """
        serializer = PresetSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                'message': '请求数据无效',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 验证图片大小
            face_image = serializer.validated_data['face_image']
            gesture_image = serializer.validated_data['gesture_image']

            if not validate_image_size(face_image) or not validate_image_size(gesture_image):
                return Response({
                    'message': '图片大小超过限制（最大5MB）'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 转换图片（供后续识别和特征提取使用）
            face_array = base64_to_image(face_image)
            gesture_array = base64_to_image(gesture_image)

            # 获取或识别用户
            user = None
            user_id = serializer.validated_data.get('user_id')
            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    return Response({
                        'message': '用户不存在'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # 通过人脸识别确定用户
                users = User.objects.all()
                if not users.exists():
                    return Response({
                        'message': '系统中暂无用户'
                    }, status=status.HTTP_404_NOT_FOUND)
                db_embeddings = []
                for u in users:
                    db_embeddings.append({
                        'user_id': str(u.id),
                        'name': u.name,
                        'embedding': u.face_encoding,
                        'face_image': u.face_image
                    })
                face_match = find_matching_face(face_array, db_embeddings)
                user = User.objects.get(id=face_match['user_id'])

            # 检查预设名称是否重复
            preset_name = serializer.validated_data['name']
            if Preset.objects.filter(user=user, name=preset_name).exists():
                return Response({
                    'message': '该预设名称已存在'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 提取人脸特征
            logger.info(f"正在为预设 '{preset_name}' 提取人脸特征...")
            face_result = extract_face_features(face_array)

            if not face_result['face_detected']:
                return Response({
                    'message': '未检测到人脸，请确保图片中包含清晰的人脸'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 提取手势特征
            logger.info(f"正在为预设 '{preset_name}' 提取手势特征...")
            gesture_result = extract_gesture_features(gesture_array)

            if not gesture_result['hand_detected']:
                return Response({
                    'message': '未检测到手势，请确保图片中包含清晰的手势'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 创建预设
            preset = Preset.objects.create(
                name=preset_name,
                user=user,
                face_image=face_image,
                gesture_image=gesture_image,
                gesture_encoding=gesture_result['landmarks'],
                gesture_digit=gesture_result.get('digit'),
                device_states=serializer.validated_data['device_states']
            )

            logger.info(f"预设创建成功: {preset.name} (ID: {preset.id})")

            # 返回预设信息
            response_data = {
                'id': str(preset.id),
                'name': preset.name,
                'user_id': str(user.id),
                'user_name': user.name,
                'gesture_digit': preset.gesture_digit,
                'created_at': preset.created_at.isoformat()
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except (FaceRecognitionError, GestureRecognitionError, InvalidImageError) as e:
            logger.error(f"预设创建失败: {str(e)}")
            return Response({
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"预设创建失败: {str(e)}")
            return Response({
                'message': '服务器内部错误'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PresetRecognizeView(APIView):
    """预设识别视图"""

    permission_classes = [AllowAny]

    def post(self, request):
        """
        识别预设 - 通过人脸和手势识别对应的预设

        POST /api/v1/presets/recognize/
        {
            "face_image": "data:image/jpeg;base64,...",
            "gesture_image": "data:image/jpeg;base64,..."
        }
        """
        serializer = PresetRecognizeSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                'message': '请求数据无效',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 验证图片大小
            face_image = serializer.validated_data['face_image']
            gesture_image = serializer.validated_data['gesture_image']

            if not validate_image_size(face_image) or not validate_image_size(gesture_image):
                return Response({
                    'message': '图片大小超过限制（最大5MB）'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 转换图片
            face_array = base64_to_image(face_image)
            gesture_array = base64_to_image(gesture_image)

            # 步骤1: 识别人脸，获取用户
            logger.info("正在进行人脸识别...")
            users = User.objects.all()

            if not users.exists():
                return Response({
                    'message': '系统中暂无用户'
                }, status=status.HTTP_404_NOT_FOUND)

            db_embeddings = []
            for user in users:
                db_embeddings.append({
                    'user_id': str(user.id),
                    'name': user.name,
                    'embedding': user.face_encoding,
                    'face_image': user.face_image
                })

            face_match = find_matching_face(face_array, db_embeddings)
            user = User.objects.get(id=face_match['user_id'])

            logger.info(f"识别到用户: {user.name}")

            # 步骤2: 在该用户的预设中识别手势
            logger.info("正在进行手势识别...")
            user_presets = Preset.objects.filter(user=user)

            if not user_presets.exists():
                return Response({
                    'message': f'用户 {user.name} 没有任何预设'
                }, status=status.HTTP_404_NOT_FOUND)

            db_gestures = []
            for preset in user_presets:
                db_gestures.append({
                    'preset_id': str(preset.id),
                    'preset_name': preset.name,
                    'user_id': str(user.id),
                    'user_name': user.name,
                    'landmarks': preset.gesture_encoding,
                    'gesture_image': preset.gesture_image,
                    'device_states': preset.device_states
                })

            gesture_match = find_matching_gesture(gesture_array, db_gestures)

            # 更新预设最后使用时间
            preset = Preset.objects.get(id=gesture_match['preset_id'])
            preset.last_used = timezone.now()
            preset.save()

            logger.info(f"预设识别成功: {preset.name} (ID: {preset.id})")

            # 返回预设信息
            response_data = {
                'id': str(preset.id),
                'name': preset.name,
                'user_id': str(user.id),
                'user_name': user.name,
                'device_states': preset.device_states,
                'confidence': round(gesture_match['confidence'], 2)
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except UserNotFoundError as e:
            logger.warning(f"预设识别失败: {str(e)}")
            return Response({
                'message': '未识别到用户'
            }, status=status.HTTP_404_NOT_FOUND)

        except PresetNotFoundError as e:
            logger.warning(f"预设识别失败: {str(e)}")
            return Response({
                'message': '未识别到预设'
            }, status=status.HTTP_404_NOT_FOUND)

        except (FaceRecognitionError, GestureRecognitionError, InvalidImageError) as e:
            logger.error(f"预设识别失败: {str(e)}")
            return Response({
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"预设识别失败: {str(e)}")
            return Response({
                'message': '服务器内部错误'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HealthCheckView(APIView):
    """健康检查视图"""

    permission_classes = [AllowAny]

    def get(self, request):
        """健康检查"""
        return Response({
            'status': 'healthy',
            'service': 'SmartRoom Django Backend',
            'version': '1.0.0'
        }, status=status.HTTP_200_OK)

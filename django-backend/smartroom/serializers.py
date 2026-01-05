"""
Serializers for SmartRoom API.
"""
import base64
from rest_framework import serializers
from .models import User, Preset


class UserRegistrationSerializer(serializers.ModelSerializer):
    """用户注册序列化器"""

    class Meta:
        model = User
        fields = ['id', 'name', 'face_image', 'avatar_url', 'registered_at']
        read_only_fields = ['id', 'registered_at']

    def validate_face_image(self, value):
        """验证人脸图片格式"""
        if not value.startswith('data:image/'):
            raise serializers.ValidationError('无效的图片格式')
        return value

    def validate_name(self, value):
        """验证用户名"""
        if len(value.strip()) < 2:
            raise serializers.ValidationError('用户名至少需要2个字符')
        return value.strip()


class UserLoginSerializer(serializers.Serializer):
    """用户登录序列化器"""

    face_image = serializers.CharField()

    def validate_face_image(self, value):
        if not value.startswith('data:image/'):
            raise serializers.ValidationError('无效的图片格式')
        return value


class UserSerializer(serializers.ModelSerializer):
    """用户信息序列化器"""

    class Meta:
        model = User
        fields = ['id', 'name', 'avatar_url', 'registered_at', 'last_login']


class PresetSerializer(serializers.ModelSerializer):
    """预设序列化器"""
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = Preset
        fields = ['id', 'name', 'user_id', 'user_name', 'face_image', 'gesture_image',
                  'device_states', 'created_at', 'updated_at', 'last_used', 'gesture_digit']
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_used']

    def validate_face_image(self, value):
        if not value.startswith('data:image/'):
            raise serializers.ValidationError('无效的图片格式')
        return value

    def validate_gesture_image(self, value):
        if not value.startswith('data:image/'):
            raise serializers.ValidationError('无效的图片格式')
        return value

    def validate_device_states(self, value):
        """验证设备状态格式"""
        if not isinstance(value, list):
            raise serializers.ValidationError('设备状态必须是数组')
        for state in value:
            if not isinstance(state, dict):
                raise serializers.ValidationError('每个设备状态必须是对象')
            if 'device_id' not in state:
                raise serializers.ValidationError('设备状态必须包含device_id字段')
        return value

    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError('预设名称至少需要2个字符')
        return value.strip()


class PresetRecognizeSerializer(serializers.Serializer):
    """预设识别序列化器"""

    face_image = serializers.CharField()
    gesture_image = serializers.CharField()

    def validate_face_image(self, value):
        if not value.startswith('data:image/'):
            raise serializers.ValidationError('无效的图片格式')
        return value

    def validate_gesture_image(self, value):
        if not value.startswith('data:image/'):
            raise serializers.ValidationError('无效的图片格式')
        return value


class PresetResultSerializer(serializers.Serializer):
    """预设识别结果序列化器"""

    id = serializers.UUIDField()
    name = serializers.CharField()
    user_name = serializers.CharField()
    user_id = serializers.UUIDField()
    device_states = serializers.ListField()
    confidence = serializers.FloatField()


class DeviceStateSerializer(serializers.Serializer):
    """设备状态序列化器"""
    device_id = serializers.CharField()
    status = serializers.BooleanField()
    value = serializers.FloatField(allow_null=True)

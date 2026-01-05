"""
Database models for SmartRoom application.
"""
import uuid
from django.db import models
from django.core.validators import MinLengthValidator


class User(models.Model):
    """用户模型 - 存储用户信息和人脸特征"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name='用户名')
    face_image = models.TextField(verbose_name='人脸图片(Base64)')
    face_encoding = models.JSONField(verbose_name='人脸特征向量')
    avatar_url = models.TextField(blank=True, verbose_name='头像URL')
    registered_at = models.DateTimeField(auto_now_add=True, verbose_name='注册时间')
    last_login = models.DateTimeField(null=True, blank=True, verbose_name='最后登录时间')

    class Meta:
        db_table = 'users'
        verbose_name = '用户'
        verbose_name_plural = '用户'
        ordering = ['-registered_at']

    def __str__(self):
        return f"{self.name} ({self.id})"


class Preset(models.Model):
    """预设模型 - 存储用户预设配置"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name='预设名称')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='presets', verbose_name='所属用户')
    face_image = models.TextField(verbose_name='人脸图片(Base64)')
    gesture_image = models.TextField(verbose_name='手势图片(Base64)')
    gesture_encoding = models.JSONField(verbose_name='手势特征')
    gesture_digit = models.IntegerField(null=True, blank=True, verbose_name='手势数字(0-5)')
    device_states = models.JSONField(verbose_name='设备状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    last_used = models.DateTimeField(null=True, blank=True, verbose_name='最后使用时间')

    class Meta:
        db_table = 'presets'
        verbose_name = '预设'
        verbose_name_plural = '预设'
        ordering = ['-created_at']
        unique_together = [['user', 'name']]

    def __str__(self):
        return f"{self.user.name} - {self.name}"

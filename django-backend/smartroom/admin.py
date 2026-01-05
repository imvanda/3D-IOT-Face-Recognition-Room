"""
Admin configuration for SmartRoom models.
"""
from django.contrib import admin
from .models import User, Preset


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """用户管理"""

    list_display = ['id', 'name', 'registered_at', 'last_login']
    list_filter = ['registered_at', 'last_login']
    search_fields = ['name', 'id']
    readonly_fields = ['id', 'registered_at', 'face_encoding_preview']
    ordering = ['-registered_at']

    def face_encoding_preview(self, obj):
        """预览人脸编码长度"""
        if obj.face_encoding:
            return f"({len(obj.face_encoding)} 维向量)"
        return "无"
    face_encoding_preview.short_description = '人脸特征'


@admin.register(Preset)
class PresetAdmin(admin.ModelAdmin):
    """预设管理"""

    list_display = ['id', 'name', 'user', 'created_at', 'last_used']
    list_filter = ['created_at', 'last_used', 'user']
    search_fields = ['name', 'id', 'user__name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'gesture_encoding_preview']
    ordering = ['-created_at']

    fieldsets = (
        ('基本信息', {
            'fields': ('name', 'user')
        }),
        ('识别数据', {
            'fields': ('face_image', 'gesture_image', 'gesture_encoding_preview')
        }),
        ('设备配置', {
            'fields': ('device_states',)
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at', 'last_used')
        }),
    )

    def gesture_encoding_preview(self, obj):
        """预览手势编码长度"""
        if obj.gesture_encoding:
            return f"({len(obj.gesture_encoding)} 个关键点)"
        return "无"
    gesture_encoding_preview.short_description = '手势特征'

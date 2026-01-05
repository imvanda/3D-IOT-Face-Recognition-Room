"""
URL configuration for SmartRoom API.
"""
from django.urls import path
from .views import (
    UserRegistrationView,
    UserLoginView,
    PresetListView,
    PresetCreateView,
    PresetRecognizeView,
    HealthCheckView
)

urlpatterns = [
    # 健康检查
    path('health/', HealthCheckView.as_view(), name='health-check'),

    # 用户认证
    path('auth/register/', UserRegistrationView.as_view(), name='user-register'),
    path('auth/login/', UserLoginView.as_view(), name='user-login'),

    # 预设管理
    path('presets/', PresetListView.as_view(), name='preset-list'),
    path('presets/create/', PresetCreateView.as_view(), name='preset-create'),
    path('presets/recognize/', PresetRecognizeView.as_view(), name='preset-recognize'),
]

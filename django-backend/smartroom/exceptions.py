"""
Custom exception handlers for SmartRoom API.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    自定义异常处理器
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            'message': str(exc),
            'status_code': response.status_code
        }

        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                custom_response_data['errors'] = exc.detail
            else:
                custom_response_data['message'] = exc.detail

        response.data = custom_response_data

        # Log the error
        logger.error(f"API Error: {exc} - Context: {context}")

    return response


class FaceRecognitionError(Exception):
    """人脸识别错误"""
    pass


class GestureRecognitionError(Exception):
    """手势识别错误"""
    pass


class InvalidImageError(Exception):
    """无效图片错误"""
    pass


class UserNotFoundError(Exception):
    """用户未找到错误"""
    pass


class PresetNotFoundError(Exception):
    """预设未找到错误"""
    pass

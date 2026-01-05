"""
Image processing utilities.
"""
import base64
import io
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)


def base64_to_image(base64_string: str) -> np.ndarray:
    """
    将Base64字符串转换为OpenCV图像格式

    Args:
        base64_string: Base64编码的图片字符串

    Returns:
        np.ndarray: OpenCV图像数组 (BGR格式)

    Raises:
        InvalidImageError: 当图片格式无效时抛出
    """
    try:
        # 移除data:image/xxx;base64,前缀
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # 解码Base64
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))

        # 转换为RGB格式
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # 转换为numpy数组 (BGR格式，OpenCV标准)
        image_array = np.array(image)
        image_bgr = image_array[:, :, ::-1]  # RGB -> BGR

        return image_bgr

    except Exception as e:
        logger.error(f"Base64图片转换失败: {str(e)}")
        from smartroom.exceptions import InvalidImageError
        raise InvalidImageError(f"无效的图片格式: {str(e)}")


def image_to_base64(image: np.ndarray, format: str = 'JPEG') -> str:
    """
    将OpenCV图像转换为Base64字符串

    Args:
        image: OpenCV图像数组 (BGR格式)
        format: 图片格式 (JPEG, PNG)

    Returns:
        str: Base64编码的图片字符串
    """
    import cv2

    try:
        # 将BGR转换为RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # 转换为PIL图像
        pil_image = Image.fromarray(image_rgb)

        # 转换为Base64
        buffered = io.BytesIO()
        pil_image.save(buffered, format=format)
        image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return f"data:image/{format.lower()};base64,{image_base64}"

    except Exception as e:
        logger.error(f"图像转Base64失败: {str(e)}")
        raise InvalidImageError(f"图像转换失败: {str(e)}")


def validate_image_size(base64_string: str, max_size_mb: int = 5) -> bool:
    """
    验证图片大小

    Args:
        base64_string: Base64编码的图片字符串
        max_size_mb: 最大大小(MB)

    Returns:
        bool: 图片大小是否有效
    """
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]

    size_bytes = len(base64.b64decode(base64_string))
    size_mb = size_bytes / (1024 * 1024)

    if size_mb > max_size_mb:
        logger.warning(f"图片大小超过限制: {size_mb:.2f}MB > {max_size_mb}MB")
        return False

    return True

"""
Face recognition service using DeepFace.
基于项目示例: deepface-master/tests/unit/face-recognition-how.py
"""
import numpy as np
from deepface import DeepFace
from deepface.modules import verification
import logging
import os
from django.conf import settings

logger = logging.getLogger(__name__)

# 预加载模型
_model = None
_detector_backend = 'opencv'


def _get_model():
    """获取DeepFace模型实例"""
    global _model
    if _model is None:
        logger.info("加载DeepFace模型...")
        # 设置模型缓存目录
        deepface_home = getattr(settings, 'DEEPFACE_HOME', '/app/.deepface')
        os.environ['DEEPFACE_HOME'] = deepface_home
        
        # 确保目录存在
        if not os.path.exists(deepface_home):
            try:
                os.makedirs(deepface_home, exist_ok=True)
                logger.info(f"创建DeepFace目录: {deepface_home}")
            except Exception as e:
                logger.warning(f"无法创建DeepFace目录 {deepface_home}: {e}")

        _model = True  # DeepFace使用延迟加载
        logger.info(f"DeepFace模型加载完成 (Home: {deepface_home})")
    return _model


def extract_face_features(image: np.ndarray) -> dict:
    """
    提取人脸特征

    Args:
        image: OpenCV图像数组 (BGR格式)

    Returns:
        dict: 包含人脸特征向量的字典
        {
            'embedding': np.ndarray,  # 特征向量
            'face_detected': bool,    # 是否检测到人脸
            'confidence': float,      # 检测置信度
            'facial_area': dict       # 人脸区域坐标
        }

    Raises:
        FaceRecognitionError: 当人脸检测失败时抛出
    """
    _get_model()

    try:
        # 使用DeepFace检测人脸并提取特征
        faces = DeepFace.extract_faces(
            img_path=image,
            detector_backend=_detector_backend,
            enforce_detection=False
        )

        if not faces or len(faces) == 0:
            logger.warning("未检测到人脸")
            return {
                'embedding': None,
                'face_detected': False,
                'confidence': 0.0,
                'facial_area': None
            }

        # 获取第一张人脸
        face = faces[0]

        # 提取embedding
        embedding_objs = DeepFace.represent(
            img_path=image,
            model_name=settings.DEEPFACE_MODEL,
            detector_backend=_detector_backend,
            enforce_detection=False
        )

        if not embedding_objs or len(embedding_objs) == 0:
            raise Exception("无法提取人脸特征向量")

        embedding = embedding_objs[0]['embedding']

        return {
            'embedding': embedding,
            'face_detected': True,
            'confidence': face.get('confidence', 0.0),
            'facial_area': face.get('facial_area', None)
        }

    except Exception as e:
        logger.error(f"人脸特征提取失败: {str(e)}")
        from smartroom.exceptions import FaceRecognitionError
        raise FaceRecognitionError(f"人脸特征提取失败: {str(e)}")


def verify_faces(face1: np.ndarray, face2: np.ndarray) -> dict:
    """
    验证两张人脸是否匹配

    Args:
        face1: 第一张人脸图像
        face2: 第二张人脸图像

    Returns:
        dict: 验证结果
        {
            'verified': bool,        # 是否匹配
            'distance': float,        # 距离分数
            'threshold': float,       # 阈值
            'model': str,            # 使用的模型
            'detector_backend': str  # 检测器后端
        }
    """
    _get_model()

    try:
        result = DeepFace.verify(
            img1_path=face1,
            img2_path=face2,
            model_name=settings.DEEPFACE_MODEL,
            detector_backend=_detector_backend,
            distance_metric=settings.DEEPFACE_DISTANCE_METRIC,
            enforce_detection=False
        )

        return result

    except Exception as e:
        logger.error(f"人脸验证失败: {str(e)}")
        from smartroom.exceptions import FaceRecognitionError
        raise FaceRecognitionError(f"人脸验证失败: {str(e)}")


def find_matching_face(image: np.ndarray, db_embeddings: list) -> dict:
    """
    在数据库中查找匹配的人脸

    Args:
        image: 待识别的人脸图像
        db_embeddings: 数据库中的人脸特征列表
            [
                {
                    'user_id': str,
                    'name': str,
                    'embedding': list or np.ndarray,
                    'face_image': str
                },
                ...
            ]

    Returns:
        dict: 最佳匹配结果
        {
            'user_id': str,
            'name': str,
            'distance': float,
            'confidence': float,
            'verified': bool
        }

    Raises:
        UserNotFoundError: 当未找到匹配用户时抛出
    """
    _get_model()

    try:
        # 提取当前图像的人脸特征
        face_result = extract_face_features(image)

        if not face_result['face_detected']:
            from smartroom.exceptions import UserNotFoundError
            raise UserNotFoundError("未检测到人脸")

        target_embedding = np.array(face_result['embedding'])

        # 计算与所有数据库特征的距离
        min_distance = float('inf')
        best_match = None

        for db_face in db_embeddings:
            db_embedding = np.array(db_face['embedding'])

            # 计算距离（根据配置的距离度量方式）
            distance = verification.find_distance(
                target_embedding,
                db_embedding,
                settings.DEEPFACE_DISTANCE_METRIC
            )

            if distance < min_distance:
                min_distance = distance
                best_match = db_face

        # 计算置信度（基于距离）
        threshold = settings.FACE_RECOGNITION_THRESHOLD
        confidence = max(0, 1 - (min_distance / threshold))

        # 判断是否匹配
        verified = min_distance < threshold

        if not verified:
            from smartroom.exceptions import UserNotFoundError
            raise UserNotFoundError(f"未找到匹配用户 (最小距离: {min_distance:.4f}, 阈值: {threshold})")

        logger.info(f"人脸识别成功: {best_match['name']}, 距离: {min_distance:.4f}, 置信度: {confidence:.2f}")

        return {
            'user_id': best_match['user_id'],
            'name': best_match['name'],
            'avatar_url': best_match.get('face_image', ''),
            'distance': min_distance,
            'confidence': confidence,
            'verified': verified
        }

    except UserNotFoundError:
        raise
    except Exception as e:
        logger.error(f"人脸识别失败: {str(e)}")
        from smartroom.exceptions import FaceRecognitionError
        raise FaceRecognitionError(f"人脸识别失败: {str(e)}")

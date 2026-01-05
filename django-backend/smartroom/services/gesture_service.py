"""
Gesture recognition service using MediaPipe.
基于项目示例: mediapipe/testmedia.py
"""
import numpy as np
import logging
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from django.conf import settings
import os
import urllib.request
import mediapipe as mp

logger = logging.getLogger(__name__)

# MediaPipe HandLandmarker实例
_landmarker = None
_mp_image = None


def _get_landmarker():
    """获取MediaPipe HandLandmarker实例"""
    global _landmarker, _mp_image
    if _landmarker is None:
        logger.info("初始化MediaPipe HandLandmarker...")
        
        BaseOptions = python.BaseOptions
        HandLandmarkerOptions = vision.HandLandmarkerOptions
        
        model_path = getattr(settings, 'HAND_LANDMARKER_MODEL_PATH', '/app/hand_landmarker.task')
        model_url = getattr(settings, 'HAND_LANDMARKER_MODEL_URL', 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task')
        
        try:
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
        except Exception:
            pass
        
        if not os.path.exists(model_path):
            try:
                logger.info(f"下载手势模型: {model_url} -> {model_path}")
                urllib.request.urlretrieve(model_url, model_path)
            except Exception as e:
                logger.error(f"手势模型下载失败: {e}")
                raise
        
        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path, delegate=python.BaseOptions.Delegate.CPU),
            running_mode=vision.RunningMode.IMAGE,
            num_hands=getattr(settings, 'MAX_HANDS', 2),
            min_hand_detection_confidence=getattr(settings, 'MIN_DETECTION_CONFIDENCE', 0.6),
            min_hand_presence_confidence=getattr(settings, 'MIN_DETECTION_CONFIDENCE', 0.6),
            min_tracking_confidence=getattr(settings, 'MIN_TRACKING_CONFIDENCE', 0.6)
        )
        
        _landmarker = vision.HandLandmarker.create_from_options(options)
        
        logger.info("MediaPipe HandLandmarker初始化完成")
    return _landmarker


def extract_gesture_features(image: np.ndarray) -> dict:
    """
    提取手势特征

    Args:
        image: OpenCV图像数组 (BGR格式)

    Returns:
        dict: 手势特征
        {
            'landmarks': list,  # 21个关键点坐标 [[x, y, z], ...]
            'hand_detected': bool,
            'confidence': float
        }

    Raises:
        GestureRecognitionError: 当手势检测失败时抛出
    """
    landmarker = _get_landmarker()
    
    try:
        # MediaPipe需要RGB格式
        import cv2
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        logger.info("正在使用 mp.Image 处理手势图像...")
        # 创建MediaPipe图像对象
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        
        # 处理图像
        result = landmarker.detect(mp_image)
        
        if not result.hand_landmarks:
            logger.warning("未检测到手势")
            return {
                'landmarks': None,
                'hand_detected': False,
                'confidence': 0.0
            }
        
        # 获取第一只手的关键点
        hand_landmarks = result.hand_landmarks[0]
        
        # 提取21个关键点坐标
        landmarks = []
        for landmark in hand_landmarks:
            landmarks.append([landmark.x, landmark.y, landmark.z])
        
        # 获取置信度与手性标签
        confidence = 1.0
        handedness_label = None
        if result.handedness and len(result.handedness) > 0:
            handedness_label = result.handedness[0][0].category_name
            confidence = result.handedness[0][0].score
        
        # 计算手势数字（0-5，根据伸展的手指数量）
        digit = classify_gesture_digit(landmarks, handedness_label)
        
        return {
            'landmarks': landmarks,
            'hand_detected': True,
            'confidence': confidence,
            'digit': digit,
            'handedness': handedness_label
        }
        
    except Exception as e:
        logger.error(f"手势特征提取失败: {str(e)}")
        from smartroom.exceptions import GestureRecognitionError
        raise GestureRecognitionError(f"手势特征提取失败: {str(e)}")


def match_gesture(gesture1: list, gesture2: list, threshold: float = 0.15) -> dict:
    """
    匹配两个手势特征

    Args:
        gesture1: 第一个手势的关键点 [[x, y, z], ...] (21个点)
        gesture2: 第二个手势的关键点 [[x, y, z], ...] (21个点)
        threshold: 匹配阈值

    Returns:
        dict: 匹配结果
        {
            'matched': bool,
            'distance': float,
            'confidence': float
        }
    """
    try:
        if not gesture1 or not gesture2:
            return {
                'matched': False,
                'distance': float('inf'),
                'confidence': 0.0
            }
        
        # 转换为numpy数组
        arr1 = np.array(gesture1)
        arr2 = np.array(gesture2)
        
        # 计算欧氏距离（只考虑x和y坐标，忽略z）
        distance = np.sqrt(np.sum((arr1[:, :2] - arr2[:, :2]) ** 2, axis=1))
        avg_distance = np.mean(distance)
        
        # 计算置信度
        confidence = max(0, 1 - (avg_distance / threshold))
        
        matched = avg_distance < threshold
        
        logger.debug(f"手势匹配: 距离={avg_distance:.4f}, 阈值={threshold}, 匹配={matched}")
        
        return {
            'matched': matched,
            'distance': float(avg_distance),
            'confidence': float(confidence)
        }
        
    except Exception as e:
        logger.error(f"手势匹配失败: {str(e)}")
        from smartroom.exceptions import GestureRecognitionError
        raise GestureRecognitionError(f"手势匹配失败: {str(e)}")

def classify_gesture_digit(landmarks: list, handedness: str | None = None) -> int:
    """
    将手势关键点粗略分类为数字 0-5（统计伸展手指数量）
    规则：
    - 食指、中指、无名指、小指：tip.y < pip.y 则认为伸展
    - 拇指：|tip.x - ip.x| > 阈值 则认为伸展（不依赖左右手）
    """
    try:
        if not landmarks or len(landmarks) < 21:
            return 0
        
        # 采用归一化坐标（相对手腕）
        norm = normalize_gesture(landmarks)
        
        def is_extended_y(tip_idx: int, pip_idx: int, y_thresh: float = 0.02) -> bool:
            tip_y = norm[tip_idx][1]
            pip_y = norm[pip_idx][1]
            return tip_y < (pip_y - y_thresh)
        
        def is_thumb_extended(thresh: float = 0.03) -> bool:
            tip_x = norm[4][0]
            ip_x = norm[3][0]
            return abs(tip_x - ip_x) > thresh
        
        count = 0
        # 食指 8 tip, 6 pip
        if is_extended_y(8, 6): count += 1
        # 中指 12 tip, 10 pip
        if is_extended_y(12, 10): count += 1
        # 无名指 16 tip, 14 pip
        if is_extended_y(16, 14): count += 1
        # 小指 20 tip, 18 pip
        if is_extended_y(20, 18): count += 1
        # 拇指
        if is_thumb_extended(): count += 1
        
        # 限制范围 0-5
        return max(0, min(5, count))
    except Exception:
        return 0

def find_matching_gesture(
    image: np.ndarray,
    db_gestures: list,
    threshold: float = 0.15
) -> dict:
    """
    在数据库中查找匹配的手势

    Args:
        image: 待识别的手势图像
        db_gestures: 数据库中的手势特征列表
            [
                {
                    'preset_id': str,
                    'preset_name': str,
                    'user_id': str,
                    'user_name': str,
                    'landmarks': list,
                    'gesture_image': str,
                    'device_states': list
                },
                ...
            ]
        threshold: 匹配阈值

    Returns:
        dict: 最佳匹配结果
        {
            'preset_id': str,
            'preset_name': str,
            'user_id': str,
            'user_name': str,
            'device_states': list,
            'distance': float,
            'confidence': float
        }

    Raises:
        PresetNotFoundError: 当未找到匹配预设时抛出
    """
    try:
        # 提取当前图像的手势特征
        gesture_result = extract_gesture_features(image)
        
        if not gesture_result['hand_detected']:
            from smartroom.exceptions import PresetNotFoundError
            raise PresetNotFoundError("未检测到手势")
        
        target_landmarks = gesture_result['landmarks']
        
        # 计算与所有数据库手势的距离
        min_distance = float('inf')
        best_match = None
        
        for db_gesture in db_gestures:
            result = match_gesture(target_landmarks, db_gesture['landmarks'], threshold)
            
            if result['matched'] and result['distance'] < min_distance:
                min_distance = result['distance']
                best_match = db_gesture
                best_match['gesture_confidence'] = result['confidence']
        
        if not best_match:
            from smartroom.exceptions import PresetNotFoundError
            raise PresetNotFoundError(f"未找到匹配预设 (最小距离: {min_distance:.4f}, 阈值: {threshold})")
        
        logger.info(f"手势识别成功: {best_match['preset_name']}, 距离: {min_distance:.4f}")
        
        return {
            'preset_id': best_match['preset_id'],
            'preset_name': best_match['preset_name'],
            'user_id': best_match['user_id'],
            'user_name': best_match['user_name'],
            'device_states': best_match['device_states'],
            'distance': min_distance,
            'confidence': best_match['gesture_confidence']
        }
        
    except PresetNotFoundError:
        raise
    except Exception as e:
        logger.error(f"手势识别失败: {str(e)}")
        from smartroom.exceptions import GestureRecognitionError
        raise GestureRecognitionError(f"手势识别失败: {str(e)}")


def normalize_gesture(landmarks: list) -> list:
    """
    归一化手势关键点（基于手腕位置）

    Args:
        landmarks: 原始关键点 [[x, y, z], ...]

    Returns:
        list: 归一化后的关键点
    """
    if not landmarks:
        return []
    
    # 以手腕（第0个点）为基准点
    wrist = landmarks[0]
    wrist_x, wrist_y = wrist[0], wrist[1]
    
    normalized = []
    for lm in landmarks:
        normalized.append([lm[0] - wrist_x, lm[1] - wrist_y, lm[2]])
    
    return normalized

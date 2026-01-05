import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ====================== 配置 ======================
BaseOptions = python.BaseOptions
HandLandmarker = vision.HandLandmarker
HandLandmarkerOptions = vision.HandLandmarkerOptions
VisionRunningMode = vision.RunningMode

options = HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='hand_landmarker.task'),
    running_mode=VisionRunningMode.VIDEO,
    num_hands=2,
    min_hand_detection_confidence=0.6,      # 提高避免误检
    min_hand_presence_confidence=0.6,
    min_tracking_confidence=0.6
)

# ====================== 手部骨骼连接线 ======================
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),      # 拇指
    (0, 5), (5, 6), (6, 7), (7, 8),      # 食指
    (0, 9), (9, 10), (10, 11), (11, 12), # 中指
    (0, 13), (13, 14), (14, 15), (15, 16), # 无名指
    (0, 17), (17, 18), (18, 19), (19, 20), # 小指
    (5, 9), (9, 13), (13, 17)            # 掌心连接
]

# ====================== 手指计数函数（已修正镜像 + 更准确） ======================
def count_fingers(hand_landmarks, original_label):
    fingers = 0
    tip_ids = [4, 8, 12, 16, 20]   # 指尖
    pip_ids = [2, 6, 10, 14, 18]   # PIP关节（更稳定参考点）

    # 镜像翻转导致左右手标签反了，先修正
    corrected_label = "Right" if original_label == "Left" else "Left"

    # 大拇指判断（横向）
    if corrected_label == "Left":  # 画面中的左手（实际左手）
        if hand_landmarks[tip_ids[0]].x < hand_landmarks[tip_ids[0]-2].x - 0.03:
            fingers += 1
    else:  # 画面中的右手（实际右手）
        if hand_landmarks[tip_ids[0]].x > hand_landmarks[tip_ids[0]-2].x + 0.03:
            fingers += 1

    # 其他四指（纵向）
    for i in range(1, 5):
        if hand_landmarks[tip_ids[i]].y < hand_landmarks[pip_ids[i]].y - 0.03:
            fingers += 1

    return fingers, corrected_label

# ====================== 主程序 ======================
with HandLandmarker.create_from_options(options) as landmarker:
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("错误：无法打开摄像头！")
        exit()

    print("手势识别已启动！伸出 1~5 根手指试试，按 'q' 退出")

    while cap.isOpened():
        success, image = cap.read()
        if not success:
            continue

        # 镜像翻转（像镜子一样更自然）
        image = cv2.flip(image, 1)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)

        import time
        timestamp_ms = int(time.time() * 1000)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        annotated_image = image.copy()

        displayed_count = 0  # 用于垂直排列显示

        if result.hand_landmarks:
            for idx, hand_landmarks in enumerate(result.hand_landmarks):
                # 过滤低置信度手（避免背景误检）
                handedness = result.handedness[idx][0]
                if handedness.score < 0.7:
                    continue

                # 绘制关键点（绿色圆点）
                for landmark in hand_landmarks:
                    x = int(landmark.x * image.shape[1])
                    y = int(landmark.y * image.shape[0])
                    cv2.circle(annotated_image, (x, y), 7, (0, 255, 0), -1)

                # 绘制连接线（蓝色）
                for start_idx, end_idx in HAND_CONNECTIONS:
                    start = hand_landmarks[start_idx]
                    end = hand_landmarks[end_idx]
                    cv2.line(annotated_image,
                             (int(start.x * image.shape[1]), int(start.y * image.shape[0])),
                             (int(end.x * image.shape[1]), int(end.y * image.shape[0])),
                             (255, 0, 0), 3)

                # 手指计数 + 左右手修正
                original_label = handedness.category_name
                finger_count, corrected_label = count_fingers(hand_landmarks, original_label)

                # 显示信息（大字体清晰）
                y_base = 80 + displayed_count * 140
                cv2.putText(annotated_image, f"{corrected_label} Hand", (50, y_base),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 255, 255), 5)
                cv2.putText(annotated_image, f"Fingers: {finger_count}", (50, y_base + 70),
                            cv2.FONT_HERSHEY_SIMPLEX, 3.0, (255, 255, 0), 8)

                displayed_count += 1

        cv2.imshow('Hand Gesture Recognition - Accurate 1-5 Count!', annotated_image)

        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
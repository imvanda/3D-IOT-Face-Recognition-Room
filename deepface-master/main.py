from deepface import DeepFace

# 1. 人脸验证（判断两张图片是否是同一个人）
print("正在进行人脸验证...")
verify_result = DeepFace.verify(
    img1_path="Data/img.jpg",
    img2_path="Data/img2.jpg",
    model_name="VGG-Face",          # 可选：ArcFace、Facenet512 等更精准
    detector_backend="opencv",      # 可选：retinaface、mtcnn、yolov8 等
    enforce_detection=True,
    align=True
)

print("=== 人脸验证结果 ===")
print(f"是否同一人: {verify_result['verified']}")
print(f"相似度距离: {verify_result['distance']:.4f} (越小越相似)")
print(f"置信度: {verify_result['confidence']:.2f}%")
print(f"耗时: {verify_result['time']:.2f} 秒")
print("-" * 50)

# 2. 对两张图片分别进行属性分析（年龄、性别、情绪、种族）
images = ["Data/img.jpg", "Data/img2.jpg"]
names = ["第一张图片 (img.jpg)", "第二张图片 (img2.jpg)"]

for i, img_path in enumerate(images):
    print(f"正在分析 {names[i]} 的面部属性...")
    try:
        analysis_result = DeepFace.analyze(
            img_path=img_path,
            actions=['age', 'gender', 'emotion', 'race'],  # 可以只选部分，如 ['age', 'gender']
            detector_backend="opencv",
            enforce_detection=True,
            align=True,
            silent=False
        )

        # analysis_result 是列表（即使只有一张脸），取第一个
        info = analysis_result[0]

        print(f"=== {names[i]} 属性分析结果 ===")
        print(f"年龄: {info['age']} 岁")
        print(f"性别: {info['dominant_gender']} (置信度: {info['gender'][info['dominant_gender']]:.1f}%)")
        print(f"主导情绪: {info['dominant_emotion']} (置信度: {info['emotion'][info['dominant_emotion']]:.1f}%)")
        print(f"主导种族: {info['dominant_race']} (置信度: {info['race'][info['dominant_race']]:.1f}%)")
        print(f"人脸检测置信度: {info['face_confidence']:.3f}")
        print("-" * 50)

    except Exception as e:
        print(f"分析 {names[i]} 时出错: {e}")
        print("-" * 50)
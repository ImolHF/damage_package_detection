import shutil
from pathlib import Path
from uuid import uuid4
from PIL import Image
from .config import WEIGHTS_PATH, RESULT_DIR, CLASS_MAPPING

_model = None


def translate_class(name: str):
    normalized = name.lower().replace("-", "_").replace(" ", "_")
    return CLASS_MAPPING.get(normalized, {"type": name, "level": "L2"})


def get_model():
    global _model
    if _model is None:
        if not WEIGHTS_PATH.exists():
            return None
        from ultralytics import YOLO
        _model = YOLO(str(WEIGHTS_PATH))
    return _model


def decide(detections):
    if not detections:
        return {"damage_type": "未检测到破损", "damage_level": "L1", "status": "passed",
                "recommendation": "未检测到明显包装破损，建议通过。", "reason": "模型未检测到已定义的破损类别。"}
    highest = max(detections, key=lambda x: ({"L1": 1, "L2": 2, "L3": 3}.get(x["level"], 2), x["confidence"]))
    level = highest["level"]
    copy = {
        "L1": ("low_risk", "轻微破损已记录，建议通过下一流程。"),
        "L2": ("review_required", "检测到中度损伤，建议人工复核包装及内件风险。"),
        "L3": ("high_risk", "检测到重度损伤，建议拒收或转售后核验。")
    }
    status, recommendation = copy.get(level, copy["L2"])
    return {"damage_type": highest["damage_type"], "damage_level": level, "status": status,
            "recommendation": recommendation,
            "reason": f"检测到{highest['damage_type']}{level}，模型置信度 {highest['confidence']:.0%}。"}


def predict(image_path, confidence=0.35):
    image = Image.open(image_path)
    width, height = image.size
    model = get_model()
    filename = f"{uuid4().hex}.jpg"
    result_path = RESULT_DIR / filename
    if model is None:
        # 无权重时保留原图，让前端仍可完整演示界面和流程。
        shutil.copy2(image_path, result_path)
        return [], filename, width, height, "demo"
    result = model.predict(source=str(image_path), conf=confidence, imgsz=640, save=False, verbose=False)[0]
    result.save(filename=str(result_path))
    detections = []
    for box in result.boxes or []:
        x1, y1, x2, y2 = [round(float(v), 1) for v in box.xyxy[0].tolist()]
        label = result.names[int(box.cls[0])]
        mapped = translate_class(label)
        detections.append({"label": label, "damage_type": mapped["type"], "level": mapped["level"],
                           "confidence": round(float(box.conf[0]), 4), "bbox": [x1, y1, x2, y2],
                           "area_ratio": round((x2-x1)*(y2-y1)/(width*height), 4)})
    return detections, filename, width, height, "model"

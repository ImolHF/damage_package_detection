from pathlib import Path
from uuid import uuid4
from PIL import Image, ImageDraw
from .config import PACKAGE_WEIGHTS_PATH, DAMAGE_WEIGHTS_PATH, RESULT_DIR, CLASS_MAPPING

_package_model = None
_damage_model = None


def translate_class(name: str):
    normalized = name.lower().replace("-", "_").replace(" ", "_")
    return CLASS_MAPPING.get(normalized, {"type": name, "level": "L2"})


def get_models():
    global _package_model, _damage_model
    if _package_model is None or _damage_model is None:
        if not PACKAGE_WEIGHTS_PATH.exists() or not DAMAGE_WEIGHTS_PATH.exists():
            return None, None
        from ultralytics import YOLO
        _package_model = YOLO(str(PACKAGE_WEIGHTS_PATH))
        _damage_model = YOLO(str(DAMAGE_WEIGHTS_PATH))
    return _package_model, _damage_model


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
    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    package_model, damage_model = get_models()
    filename = f"{uuid4().hex}.jpg"
    result_path = RESULT_DIR / filename
    if package_model is None or damage_model is None:
        image.save(result_path, quality=92)
        return [], filename, width, height, "demo"

    package_result = package_model.predict(source=image, conf=0.25, imgsz=640, save=False, verbose=False)[0]
    package_boxes = list(package_result.boxes or [])
    if package_boxes:
        best = max(package_boxes, key=lambda box: float(box.conf[0]))
        px1, py1, px2, py2 = [float(v) for v in best.xyxy[0].tolist()]
        pad_x, pad_y = (px2 - px1) * 0.08, (py2 - py1) * 0.08
        crop_box = (max(0, int(px1 - pad_x)), max(0, int(py1 - pad_y)), min(width, int(px2 + pad_x)), min(height, int(py2 + pad_y)))
    else:
        crop_box = (0, 0, width, height)

    crop = image.crop(crop_box)
    result = damage_model.predict(source=crop, conf=confidence, imgsz=640, save=False, verbose=False)[0]
    detections = []
    for box in result.boxes or []:
        cx1, cy1, cx2, cy2 = [float(v) for v in box.xyxy[0].tolist()]
        x1, y1, x2, y2 = [round(v, 1) for v in (cx1 + crop_box[0], cy1 + crop_box[1], cx2 + crop_box[0], cy2 + crop_box[1])]
        label = result.names[int(box.cls[0])]
        mapped = translate_class(label)
        detections.append({"label": label, "damage_type": mapped["type"], "level": mapped["level"],
                           "confidence": round(float(box.conf[0]), 4), "bbox": [x1, y1, x2, y2],
                           "area_ratio": round((x2-x1)*(y2-y1)/(width*height), 4)})

    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)
    draw.rectangle(crop_box, outline="#2563eb", width=max(2, width // 400))
    for item in detections:
        draw.rectangle(item["bbox"], outline="#e1251b", width=max(3, width // 250))
        draw.text((item["bbox"][0] + 4, max(0, item["bbox"][1] - 16)), f'{item["label"]} {item["confidence"]:.0%}', fill="#e1251b")
    annotated.save(result_path, quality=92)
    return detections, filename, width, height, "two_stage_v1"

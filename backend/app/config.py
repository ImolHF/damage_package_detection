import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(os.getenv("REPO_ROOT", str(BASE_DIR.parent)))
PACKAGE_WEIGHTS_PATH = Path(os.getenv("PACKAGE_WEIGHTS_PATH", str(REPO_ROOT / "models" / "v1" / "package_detector_yolo11n_v1.pt")))
DAMAGE_WEIGHTS_PATH = Path(os.getenv("DAMAGE_WEIGHTS_PATH", str(REPO_ROOT / "models" / "v1" / "damage_detector_yolo11s_nine_class_v1.pt")))
# 云端部署时将 PARCEL_STORAGE_DIR 指向持久化磁盘挂载目录，例如 /var/data。
STORAGE_DIR = Path(os.getenv("PARCEL_STORAGE_DIR", str(BASE_DIR)))
UPLOAD_DIR = STORAGE_DIR / "uploads"
RESULT_DIR = STORAGE_DIR / "results"
DATA_DIR = STORAGE_DIR / "data"
DB_PATH = DATA_DIR / "parcel_damage.db"

for directory in (UPLOAD_DIR, RESULT_DIR, DATA_DIR):
    directory.mkdir(parents=True, exist_ok=True)

# 模型训练完成后，将 data.yaml 中的类别名对应到此处即可。
# 支持中文或英文类别名；未知类别将以原名称展示。
CLASS_MAPPING = {
    "tear_l1": {"type": "撕裂", "level": "L1"},
    "tear_l2": {"type": "撕裂", "level": "L2"},
    "tear_l3": {"type": "撕裂", "level": "L3"},
    "deformed_l1": {"type": "变形", "level": "L1"},
    "deformed_l2": {"type": "变形", "level": "L2"},
    "deformed_l3": {"type": "变形", "level": "L3"},
    "wet_l1": {"type": "浸湿", "level": "L1"},
    "wet_l2": {"type": "浸湿", "level": "L2"},
    "wet_l3": {"type": "浸湿", "level": "L3"},
    "破损_l1": {"type": "破损", "level": "L1"},
    "破损_l2": {"type": "破损", "level": "L2"},
    "破损_l3": {"type": "破损", "level": "L3"},
    "变形_l1": {"type": "变形", "level": "L1"},
    "变形_l2": {"type": "变形", "level": "L2"},
    "变形_l3": {"type": "变形", "level": "L3"},
    "浸湿_l1": {"type": "浸湿", "level": "L1"},
    "浸湿_l2": {"type": "浸湿", "level": "L2"},
    "浸湿_l3": {"type": "浸湿", "level": "L3"},
}

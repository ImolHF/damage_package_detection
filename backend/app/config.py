import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
WEIGHTS_PATH = Path(os.getenv("WEIGHTS_PATH", str(BASE_DIR / "weights" / "best.pt")))
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
    "damaged_l1": {"type": "破损", "level": "L1"},
    "damaged_l2": {"type": "破损", "level": "L2"},
    "damaged_l3": {"type": "破损", "level": "L3"},
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

# V3 面积感知损伤模型

本目录保存目前真实照片综合效果最好的损伤模型。它以 V2 分层多任务模型为起点继续训练，在严重程度分支中显式加入损伤框相对包裹裁剪区域的几何信息。

V1、V2 均继续保留，V3 不会覆盖旧版本。

## 文件

| 文件 | 用途 |
| --- | --- |
| `damage_detector_yolo11s_area_aware_best_epoch19_v3.pt` | 在裁剪后的包裹图片中检测损伤类型和三级严重程度 |
| `../../damage_multitask/model.py` | 自定义分层及面积感知检测头；加载模型时必须存在 |

模型大小约 19.6 MB，SHA-256：

```text
8BB002A0870B54B46610FEBD062C92146C15D2056056E07CE3E96CE1F4D4C6CF
```

## V3 比 V2 多了什么

V2 使用两个任务分支：

1. 判断损伤类型；
2. 判断该类型的严重程度。

V3 在严重程度分支中继续加入：

- 损伤框面积占包裹裁剪图的比例；
- 损伤框宽度比例；
- 损伤框高度比例；
- 损伤框长宽比；
- 损伤框中心位置。

面积信息用于帮助严重程度判断。当前仍使用矩形框面积近似真实损伤面积。

## 九个输出类别

```text
0: tear_l1
1: tear_l2
2: tear_l3
3: deformation_l1
4: deformation_l2
5: deformation_l3
6: wet_l1
7: wet_l2
8: wet_l3
```

其中 `l1`、`l2`、`l3` 分别表示一级、二级、三级。

## 安装环境

在仓库根目录执行：

```powershell
pip install "ultralytics==8.4.137" opencv-python
```

还需要安装与运行设备匹配的 PyTorch。没有 NVIDIA 显卡时可以使用 CPU，但推理速度较慢。

## 加载模型

这个模型包含自定义检测头。必须先导入 `damage_multitask.model`，再调用 Ultralytics：

```python
import damage_multitask.model  # 必须在加载权重之前执行
from ultralytics import YOLO

model = YOLO(
    "models/v3/damage_detector_yolo11s_area_aware_best_epoch19_v3.pt"
)
```

如果程序从 `backend` 文件夹启动，先把仓库根目录加入 Python 搜索路径：

```python
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

import damage_multitask.model
from ultralytics import YOLO
```

## 推理示例

V3 应接收包裹检测模型裁剪出的单个包裹图片。静态图片演示建议使用 1280 分辨率：

```python
results = model.predict(
    source="package_crop.jpg",
    imgsz=1280,
    conf=0.10,       # 先保留低阈值候选，随后按损伤类型分别过滤
    iou=0.55,
    max_det=30,
    device=0,        # 没有 NVIDIA 显卡时改成 "cpu"
    verbose=False,
)
```

推荐的初始分类别阈值：

```text
撕裂 tear:             0.20
形变 deformation:      0.10
浸湿 wet:              0.25
```

因为 `model.predict()` 只有一个基础置信度参数，所以先设置为三个阈值中的最小值 `0.10`，得到候选框后再按 `class_id // 3` 过滤：

```python
thresholds = (0.20, 0.10, 0.25)

for result in results:
    for box in result.boxes:
        class_id = int(box.cls.item())
        confidence = float(box.conf.item())
        damage_type = class_id // 3  # 0撕裂，1形变，2浸湿
        if confidence < thresholds[damage_type]:
            continue

        xyxy = box.xyxy[0].tolist()
        print(model.names[class_id], confidence, xyxy)
```

同一损伤类型的三级框可能重叠。后端应在三个等级之间执行一次类别无关的 NMS，保留置信度最高的等级；不同损伤类型不要轻易互相抑制，因为同一个部位可能同时存在撕裂和形变。

## 两阶段调用顺序

```text
原始照片
  ↓
包裹检测模型
  ↓
裁剪包裹，四周保留约 5%～10% 边缘
  ↓
V3 面积感知损伤模型，imgsz=1280
  ↓
分类别阈值过滤和同类型等级框去重
  ↓
损伤位置、类型、程度和置信度
```

## 训练与验证结果

V3 在第 19 轮取得最佳验证结果，并在连续 25 轮没有刷新后于第 44 轮早停。

| Precision | Recall | mAP50 | mAP50-95 |
| ---: | ---: | ---: | ---: |
| 0.1807 | 0.1953 | 0.1506 | 0.0466 |

V2 的最佳 mAP50-95 为 0.0437，V3 提升约 6.5%。V3 在部分真实照片上的综合表现更好，但验证指标仍然较低，轻度非典型损伤仍可能漏检，胶带、反光和接缝仍可能误报。

## 版本说明

- `models/v1`：早期约 400 张数据训练的普通模型；
- `models/v2`：新版数据训练的分层多任务模型，约第 36 轮最佳；
- `models/v3`：在 V2 基础上加入显式面积与位置信息，第 19 轮最佳；
- 当前后端默认配置仍指向 V1。切换后端模型前，需要按照上面的方式加载自定义检测头。
- 本模型用于比赛 Demo，不应直接作为真实赔付依据。

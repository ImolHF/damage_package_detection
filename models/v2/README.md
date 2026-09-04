# V2 分层多任务损伤模型

本目录保存当前演示效果最好的分层多任务损伤模型。它使用新版约 1300 张包裹图片构建的数据集训练，最佳检查点出现在约第 36 轮。

## 文件

| 文件 | 用途 |
| --- | --- |
| `damage_detector_yolo11s_hierarchical_best_epoch36_v2.pt` | 在已经裁剪出的包裹区域内检测损伤，并输出损伤类型和三级严重程度 |
| `../../damage_multitask/model.py` | 模型自定义检测头；加载 `.pt` 文件时必须保留 |

权重 SHA-256：

```text
A3FCA9944D2CE880197A0160379EF0276F2DAB548665C13ABD2C9BE51A19060E
```

## 模型结构

模型保留 YOLO11s 的主干和多尺度检测结构，将普通九分类头拆为两个任务：

1. 损伤类型：`tear`、`deformation`、`wet`；
2. 对应类型的严重程度：一级、二级、三级。

推理时两个分支重新组合为原来的九个类别，所以输出类别编号仍与 V1 一致：

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

## 安装环境

建议在仓库根目录执行：

```powershell
pip install "ultralytics==8.4.137" opencv-python
```

有 NVIDIA 显卡时还需要安装与本机 CUDA 兼容的 PyTorch。没有显卡也能使用，速度会慢一些。

## 最简单的调用方法

必须先导入 `damage_multitask.model`，再加载模型。否则 Python 不认识权重中的自定义检测头。

```python
import damage_multitask.model  # 必须保留，不能删除
from ultralytics import YOLO

model = YOLO(
    "models/v2/damage_detector_yolo11s_hierarchical_best_epoch36_v2.pt"
)

# 输入应是包裹模型裁剪出的包裹图片，而不是包含大量背景的整张照片。
results = model.predict(
    source="package_crop.jpg",
    imgsz=960,
    conf=0.15,
    device=0,       # 没有 NVIDIA 显卡时改为 "cpu"
    verbose=False,
)

for result in results:
    for box in result.boxes:
        class_id = int(box.cls.item())
        confidence = float(box.conf.item())
        xyxy = box.xyxy[0].tolist()
        print(model.names[class_id], confidence, xyxy)
```

如果代码从 `backend` 文件夹内启动，需要先把仓库根目录加入 Python 搜索路径：

```python
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

import damage_multitask.model
from ultralytics import YOLO
```

## 与包裹模型串联

调用顺序如下：

```text
原始照片
  ↓
models/v1/package_detector_yolo11n_v1.pt
  ↓
按包裹框裁剪，四周保留约 5%～10% 边缘
  ↓
damage_detector_yolo11s_hierarchical_best_epoch36_v2.pt
  ↓
损伤位置、损伤类型、严重程度、置信度
```

建议先使用 `conf=0.15` 测试。误报较多时逐步提高到 `0.20` 或 `0.25`；漏检较多时可降低到 `0.10`。正式使用前应在固定测试集上确定阈值。

## 当前验证结果

最佳轮次附近的整体结果：

| Precision | Recall | mAP50 | mAP50-95 |
| ---: | ---: | ---: | ---: |
| 0.3202 | 0.1291 | 0.1106 | 0.0437 |

该版本在部分真实演示照片上的主观效果优于普通九分类模型，但召回率和 mAP 仍然较低，属于比赛演示阶段模型，不能当作生产环境的自动定损依据。

## 注意事项

- 不要覆盖 `models/v1`，V1 继续保留作为对照。
- 不要把该权重直接当作普通 YOLO11 权重而删除 `damage_multitask` 目录。
- 训练输入尺寸为 960；推理时优先使用 `imgsz=960`。
- 输入最好只包含一个完整包裹。
- 胶带、面单、反光和阴影仍可能导致误报。

# V1 模型说明

这里保存项目第一版模型。两个模型均使用项目早期约 400 张图片的数据集训练，用于第一版两阶段识别演示。

## 文件

| 文件 | 模型 | 用途 | 训练数据 |
| --- | --- | --- | --- |
| `package_detector_yolo11n_v1.pt` | YOLO11n | 找到图片中的包裹并输出包裹框 | 442 张有效图片、461 个包裹框 |
| `damage_detector_yolo11s_nine_class_v1.pt` | YOLO11s | 在包裹区域内识别损伤类型和严重程度 | 456 张图片、750 个损伤框 |

推荐调用顺序：

```text
原始图片
  ↓
package_detector_yolo11n_v1.pt（检测包裹）
  ↓
裁剪包裹区域
  ↓
damage_detector_yolo11s_nine_class_v1.pt（检测损伤）
```

## 类别

包裹检测模型只有一个类别：

```text
0: package
```

损伤检测模型有九个类别：

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

其中：

- `tear`：撕裂；
- `deformation`：挤压或形变；
- `wet`：浸湿；
- `l1`、`l2`、`l3`：一级、二级、三级严重程度。

## Python 调用示例

先安装 Ultralytics：

```powershell
pip install ultralytics
```

加载模型：

```python
from ultralytics import YOLO

package_model = YOLO("models/v1/package_detector_yolo11n_v1.pt")
damage_model = YOLO("models/v1/damage_detector_yolo11s_nine_class_v1.pt")

package_results = package_model("test.jpg", conf=0.25)
damage_results = damage_model("package_crop.jpg", conf=0.25)
```

`damage_model` 应接收包裹模型裁剪出的包裹图片。正式串联时，建议在包裹框四周保留约 5%～10% 的边缘，防止切掉位于纸箱边缘的损伤。

## V1 测试结果

| 模型 | Precision | Recall | mAP50 | mAP50-95 |
| --- | ---: | ---: | ---: | ---: |
| 包裹检测模型 | 0.9700 | 0.9773 | 0.9834 | 0.6641 |
| 九分类损伤模型 | 0.7048 | 0.2404 | 0.3127 | 0.1947 |

这些结果来自第一版小规模数据集。包裹模型可用于初版演示；九分类损伤模型召回率较低，容易漏检，且部分损伤等级样本很少，因此不能视为最终生产模型。

## 版本约定

- 本目录中的文件固定为 `v1`，后续重新训练时不要覆盖。
- 新模型放入新的版本目录，例如 `models/v2/`。
- 代码中不要使用含糊的 `best.pt` 文件名，应使用这里的完整模型文件名。

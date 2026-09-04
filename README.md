# 包裹破损识别系统

仓库按照协作职责分为前端和后端两个独立目录。

```text
damage_package_detection/
├─ frontend/   正式网页、页面组件、前端接口和 D1 数据库代码
├─ backend/    FastAPI、YOLO 推理、SQLite 和部署代码
└─ models/     按版本保存训练完成的模型权重
```

## 前端

```powershell
cd frontend
npm install
npm run dev
```

前端详细说明见 [`frontend/README.md`](frontend/README.md)。

## 后端

在 Windows 中进入 `backend` 后双击 `start.bat`，或者按照
[`backend/README.md`](backend/README.md) 操作。

## 协作约定

- 前端成员主要修改 `frontend/`。
- 后端成员主要修改 `backend/`。
- 修改接口时，前端和后端成员需要同步确认请求地址、字段名称和返回格式。
- 前端会优先通过 `/api/model/detect` 调用后端两阶段 YOLO V1 推理；未配置模型服务地址时自动降级为模拟流程。

## 模型

模型按版本保存：

- [`models/v1`](models/v1)：早期约 400 张数据训练的包裹模型和普通九分类损伤模型；
- [`models/v2`](models/v2)：新版数据训练的分层多任务损伤模型；
- [`models/v3`](models/v3)：当前面积感知损伤模型。

每个目录中的 README 说明了对应模型的类别、指标和调用方法。当前后端默认仍使用 V1，切换到 V2 或 V3 时必须先加载仓库中的 `damage_multitask` 自定义检测头。

## Railway 部署

仓库根目录已提供 `Dockerfile` 和 `railway.json`。连接本仓库并从根目录部署后，将前端环境变量 `MODEL_API_URL` 设置为 Railway 生成的公网地址。

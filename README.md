# 包裹破损识别系统

仓库按照协作职责分为前端和后端两个独立目录。

```text
damage_package_detection/
├─ frontend/   正式网页、页面组件、前端接口和 D1 数据库代码
└─ backend/    FastAPI、YOLO 推理、SQLite 和部署代码
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
- 当前正式前端仍使用模拟识别流程，尚未连接 `backend` 中的真实 YOLO 检测接口。

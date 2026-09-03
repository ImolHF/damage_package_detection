# 前端

这里存放正式网页、页面组件、前端接口和 Cloudflare D1 数据库代码。

## 启动

需要 Node.js 22.13 或更高版本。

```powershell
npm install
npm run dev
```

请在 `frontend` 目录中运行以上命令。

## 主要目录

- `app/`：页面和 Next.js 接口。
- `components/`：页面组件和通用控件。
- `public/`：图片和图标。
- `lib/`：数据库和公共类型。
- `db/`、`drizzle/`：D1 数据库结构与迁移。

当前检测动画和检测框仍是前端模拟结果。接入真实模型时，需要将图片上传到
`backend` 提供的 `/api/detect` 接口，并使用接口返回的检测框和定损结果。

# 包裹破损识别系统

## 启动

双击 `start.bat`。首次启动会安装依赖，随后访问 `http://localhost:8000`。

局域网演示时，在服务器电脑运行 `ipconfig` 找到 IPv4 地址；其他电脑访问 `http://该IP:8000`。请在 Windows 防火墙中允许 Python 的专用网络访问。

## 公网部署（任意电脑、任意网络可访问）

项目已提供 `Dockerfile` 与 `render.yaml`。将整个 `backend` 目录推送至你自己的 GitHub 仓库，然后在 Render 新建 **Web Service**，连接该仓库并选择 Docker 运行时。部署完成后会得到 `https://xxx.onrender.com` 公网地址。

在 Render 中设置 `PARCEL_STORAGE_DIR=/var/data`，健康检查路径为 `/api/health`。若需要长期保留检测历史和图片，请为服务挂载持久化磁盘到 `/var/data`；否则平台重部署可能清除 SQLite 和图片。

注意：普通云主机通常只提供 CPU，YOLO 推理可能较慢。要使用你们的 NVIDIA GPU，需要选择 GPU 云主机，或把本机 GPU 服务通过安全隧道暴露到公网；两者都会涉及账号、费用与部署权限。

## 接入模型

1. 包裹定位权重位于 `models/v1/package_detector_yolo11n_v1.pt`。
2. 九类破损权重位于 `models/v1/damage_detector_yolo11s_nine_class_v1.pt`。
3. 后端先定位包裹并保留 8% 边缘，再在裁剪区域识别破损并映射回原图。
4. 重启服务。系统会自动使用 NVIDIA GPU（若 PyTorch CUDA 环境可用）。

任一 V1 权重缺失时，网站仍会运行，但检测接口会返回演示模式且不会伪造检测框。

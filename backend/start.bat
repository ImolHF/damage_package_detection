@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo [1/2] 正在创建 Python 虚拟环境...
  py -m venv .venv
)
call .venv\Scripts\activate
echo 正在检查运行依赖（首次可能需要几分钟）...
pip install -r requirements.txt
echo [2/2] 系统启动中...
echo 请在浏览器访问: http://localhost:8000
echo 局域网访问请使用本机 IPv4 地址加 :8000
uvicorn app.main:app --host 0.0.0.0 --port 8000

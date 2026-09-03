from pathlib import Path
from uuid import uuid4
import shutil
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from .config import UPLOAD_DIR, RESULT_DIR
from .database import init_db, create_record, get_record, list_records, review_record, dashboard
from .detector import predict, decide

app = FastAPI(title="包裹破损识别系统")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/results", StaticFiles(directory=RESULT_DIR), name="results")

@app.on_event("startup")
def startup(): init_db()

class Review(BaseModel):
    level: str
    status: str
    note: str = ""

@app.get("/api/health")
def health(): return {"success": True, "message": "包裹破损识别服务运行中"}

@app.post("/api/detect")
async def detect(file: UploadFile = File(...), confidence: float = 0.35):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "请上传图片文件")
    suffix = Path(file.filename or ".jpg").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(400, "仅支持 JPG、PNG、WEBP 格式")
    name = f"{uuid4().hex}{suffix}"
    path = UPLOAD_DIR / name
    with path.open("wb") as target: shutil.copyfileobj(file.file, target)
    detections, result_name, width, height, mode = predict(path, confidence)
    decision = decide(detections)
    record_id = create_record({"original_image": name, "result_image": result_name, "detections": detections, **decision})
    return {"success": True, "data": {"id": record_id, "mode": mode, "image_width": width, "image_height": height,
            "original_image_url": f"/uploads/{name}", "result_image_url": f"/results/{result_name}",
            "detections": detections, "decision": decision}}

@app.get("/api/records")
def records(): return {"success": True, "data": list_records()}

@app.get("/api/records/{record_id}")
def record(record_id: int):
    data = get_record(record_id)
    if not data: raise HTTPException(404, "记录不存在")
    return {"success": True, "data": data}

@app.post("/api/records/{record_id}/review")
def review(record_id: int, payload: Review):
    data = review_record(record_id, payload.level, payload.status, payload.note)
    if not data: raise HTTPException(404, "记录不存在")
    return {"success": True, "data": data}

@app.get("/api/dashboard")
def get_dashboard(): return {"success": True, "data": dashboard()}

# 必须位于 API 路由之后，避免静态站点吞掉 /api/* 请求。
app.mount("/", StaticFiles(directory=Path(__file__).parent / "static", html=True), name="frontend")

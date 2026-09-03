import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from .config import DB_PATH


@contextmanager
def connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with connection() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            original_image TEXT NOT NULL,
            result_image TEXT NOT NULL,
            detections TEXT NOT NULL,
            damage_type TEXT NOT NULL,
            damage_level TEXT NOT NULL,
            status TEXT NOT NULL,
            recommendation TEXT NOT NULL,
            reason TEXT NOT NULL,
            review_level TEXT,
            review_status TEXT,
            review_note TEXT,
            reviewed_at TEXT
        )''')


def create_record(data):
    with connection() as conn:
        cursor = conn.execute('''INSERT INTO records
        (created_at, original_image, result_image, detections, damage_type, damage_level, status, recommendation, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
            datetime.now().isoformat(timespec="seconds"), data["original_image"], data["result_image"],
            json.dumps(data["detections"], ensure_ascii=False), data["damage_type"], data["damage_level"],
            data["status"], data["recommendation"], data["reason"]
        ))
        return cursor.lastrowid


def serialize(row):
    item = dict(row)
    item["detections"] = json.loads(item["detections"])
    return item


def list_records(limit=100):
    with connection() as conn:
        return [serialize(row) for row in conn.execute("SELECT * FROM records ORDER BY id DESC LIMIT ?", (limit,))]


def get_record(record_id):
    with connection() as conn:
        row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
        return serialize(row) if row else None


def review_record(record_id, level, status, note):
    with connection() as conn:
        conn.execute('''UPDATE records SET review_level=?, review_status=?, review_note=?, reviewed_at=? WHERE id=?''',
                     (level, status, note, datetime.now().isoformat(timespec="seconds"), record_id))
    return get_record(record_id)


def dashboard():
    records = list_records(10000)
    levels = {key: 0 for key in ("L1", "L2", "L3")}
    types = {key: 0 for key in ("破损", "变形", "浸湿")}
    reviewed = 0
    for record in records:
        levels[record["damage_level"]] = levels.get(record["damage_level"], 0) + 1
        if record["damage_type"] != "未检测到破损":
            types[record["damage_type"]] = types.get(record["damage_type"], 0) + 1
        reviewed += bool(record["reviewed_at"])
    damage_count = sum(1 for r in records if r["damage_type"] != "未检测到破损")
    return {"total": len(records), "damage_count": damage_count,
            "damage_rate": round(damage_count / len(records) * 100, 1) if records else 0,
            "levels": levels, "types": types, "reviewed": reviewed}

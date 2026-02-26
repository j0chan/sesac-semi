import os
from fastapi import FastAPI
from sqlalchemy import create_engine, text

app = FastAPI(
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.include_router(posts_router)

DATABASE_URL = os.getenv("DATABASE_URL", "")
_engine = None

def engine():
    global _engine
    if _engine is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set")
        _engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    return _engine

@app.get("/api/health")
def health():
    return {"ok": True}

@app.get("/api/db/ping")
def db_ping():
    # DB 연결/쿼리 최소 검증: SELECT 1
    with engine().connect() as conn:
        v = conn.execute(text("SELECT 1")).scalar_one()
    return {"db": "ok", "value": v}

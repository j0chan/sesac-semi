from fastapi import FastAPI
from app.routers.posts import router as posts_router

app = FastAPI(
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.include_router(posts_router)

@app.get("/api/health")
def health():
    return {"ok": True}

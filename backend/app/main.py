from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.uploads import router as uploads_router
app.include_router(uploads_router)

from app.routers.posts import router as posts_router

app = FastAPI(
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# 로컬 프론트(dev server)에서 EC2 API 호출을 허용하기 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts_router)

@app.get("/api/health")
def health():
    return {"ok": True}

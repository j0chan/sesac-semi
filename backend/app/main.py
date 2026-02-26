from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.posts import router as posts_router
from app.routers.uploads import router as uploads_router
from app.routers.auth import router as auth_router

app = FastAPI(
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# 개발 편의용 CORS (EC2 정적서빙만 쓰면 필요성은 줄지만, dev를 위해 유지)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://13.209.70.63",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts_router)
app.include_router(uploads_router)
app.include_router(auth_router)

@app.get("/api/health")
def health():
    return {"ok": True}

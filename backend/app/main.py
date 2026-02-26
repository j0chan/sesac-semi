from fastapi import FastAPI
from app.routers.posts import router as posts_router

app = FastAPI(
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# 개발용 CORS: 로컬 프론트에서 EC2 API 호출 허용
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

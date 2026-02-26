# backend/app/schemas.py
from typing import Optional
from pydantic import BaseModel

# pydantic v1/v2 호환 처리:
# - pydantic v2: from_attributes=True
# - pydantic v1: orm_mode=True
try:
    from pydantic import ConfigDict  # pydantic v2
    _V2 = True
except Exception:
    _V2 = False


class PostCreate(BaseModel):
    # POST /api/posts 요청 바디
    title: str
    content: str
    image_key: Optional[str] = None


class PostUpdate(BaseModel):
    # PUT /api/posts/{id} 요청 바디
    # "부분 수정"을 허용하기 위해 전부 Optional
    title: Optional[str] = None
    content: Optional[str] = None
    image_key: Optional[str] = None


class PostOut(BaseModel):
    # 응답 바디(조회/생성/수정 시 공통)
    id: int
    title: str
    content: str
    image_key: Optional[str] = None

    if _V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True

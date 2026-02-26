from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.s3 import (
    new_object_key,
    presign_get_url,
    presign_put_url,
    validate_content_type,
    validate_key,
)

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

class PresignPutReq(BaseModel):
    filename: str
    content_type: str

class PresignPutRes(BaseModel):
    key: str
    url: str
    method: str = "PUT"
    content_type: str

@router.post("/presign-put", response_model=PresignPutRes)
def presign_put(req: PresignPutReq):
    try:
        validate_content_type(req.content_type)
        key = new_object_key(req.filename)
        url = presign_put_url(key=key, content_type=req.content_type)
        return PresignPutRes(key=key, url=url, content_type=req.content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/presign-get")
def presign_get(key: str):
    try:
        validate_key(key)
        url = presign_get_url(key=key)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

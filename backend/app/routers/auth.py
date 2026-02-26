from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import get_db
from app.models import User
from app.auth import verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginReq(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == req.email)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer"}

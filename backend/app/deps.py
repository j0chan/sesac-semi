from typing import Optional

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import get_db
from app.models import User
from app.auth import decode_token

def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user

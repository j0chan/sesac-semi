import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"{name} is not set")
    return v

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: str) -> str:
    secret = _env("JWT_SECRET")
    exp_min = int(os.getenv("JWT_EXPIRES_MIN", "60"))
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=exp_min)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def decode_token(token: str) -> Dict[str, Any]:
    secret = _env("JWT_SECRET")
    return jwt.decode(token, secret, algorithms=["HS256"])

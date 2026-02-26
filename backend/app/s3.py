import os
import uuid
from typing import Tuple

import boto3
from botocore.config import Config

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

def _env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"{name} is not set")
    return v

def s3_client():
    return boto3.client(
        "s3",
        region_name=_env("AWS_REGION"),
        config=Config(signature_version="s3v4"),
    )

def new_object_key(filename: str) -> str:
    prefix = _env("S3_PREFIX")
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
    return f"{prefix}{uuid.uuid4().hex}{ext}"

def validate_content_type(content_type: str) -> None:
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise ValueError("Unsupported content_type")

def presign_put_url(key: str, content_type: str, expires_seconds: int = 300) -> str:
    bucket = _env("S3_BUCKET")
    return s3_client().generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_seconds,
        HttpMethod="PUT",
    )

def presign_get_url(key: str, expires_seconds: int = 300) -> str:
    bucket = _env("S3_BUCKET")
    return s3_client().generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_seconds,
        HttpMethod="GET",
    )

def validate_key(key: str) -> None:
    prefix = _env("S3_PREFIX")
    if not key.startswith(prefix):
        raise ValueError("Invalid key")
    if ".." in key:
        raise ValueError("Invalid key")

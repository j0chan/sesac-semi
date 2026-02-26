# backend/app/routers/posts.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db import get_db
from app.models import Post
from app.schemas import PostCreate, PostUpdate, PostOut

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostCreate, db: Session = Depends(get_db)):
    post = Post(
        title=payload.title,
        content=payload.content,
        image_key=payload.image_key,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.get("", response_model=List[PostOut])
def list_posts(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    stmt = select(Post).order_by(desc(Post.id)).offset(skip).limit(limit)
    rows = db.execute(stmt).scalars().all()
    return rows


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.put("/{post_id}", response_model=PostOut)
def update_post(post_id: int, payload: PostUpdate, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if payload.title is not None:
        post.title = payload.title
    if payload.content is not None:
        post.content = payload.content
    if payload.image_key is not None:
        post.image_key = payload.image_key

    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    db.delete(post)
    db.commit()
    return None

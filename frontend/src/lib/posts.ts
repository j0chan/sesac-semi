import { api } from "./api";
import type { Post, PostCreate, PostUpdate } from "../types";

export function listPosts(skip = 0, limit = 20) {
  return api.request<Post[]>(`/api/posts?skip=${skip}&limit=${limit}`);
}

export function getPost(id: number) {
  return api.request<Post>(`/api/posts/${id}`);
}

export function createPost(payload: PostCreate) {
  return api.request<Post>(`/api/posts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePost(id: number, payload: PostUpdate) {
  return api.request<Post>(`/api/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePost(id: number) {
  return api.request<void>(`/api/posts/${id}`, { method: "DELETE" });
}
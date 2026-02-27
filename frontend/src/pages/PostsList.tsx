import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Post } from "../types";
import { listPosts } from "../lib/posts";
import { isLoggedIn, logout } from "../lib/auth";

export default function PostsList() {
  const nav = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [err, setErr] = useState<string>("");

  const loggedIn = isLoggedIn();

  useEffect(() => {
    listPosts(0, 20)
      .then(setPosts)
      .catch((e) => setErr(String(e)));
  }, []);

  function onLogout() {
    logout();
    nav("/login");
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Posts</h1>
        <div style={{ marginLeft: "auto" }}>
          {loggedIn ? (
            <button onClick={onLogout}>Logout</button>
          ) : (
            <Link to="/login">Loginnn</Link>
          )}
        </div>
      </div>

      <div style={{ margin: "12px 0" }}>
        <Link to="/posts/new">New Post</Link>
      </div>

      {err && <pre style={{ color: "crimson" }}>{err}</pre>}

      <ul>
        {posts.map((p) => (
          <li key={p.id}>
            <Link to={`/posts/${p.id}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
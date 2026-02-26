import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Post } from "../types";
import { listPosts } from "../lib/posts";

export default function PostsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    listPosts(0, 20)
      .then(setPosts)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Posts</h1>
      <div style={{ marginBottom: 12 }}>
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
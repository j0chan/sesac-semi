import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createPost, getPost, updatePost } from "../lib/posts";

export default function PostEditor() {
  const { id } = useParams();
  const postId = id ? Number(id) : null;
  const isEdit = postId !== null && Number.isFinite(postId);

  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageKey, setImageKey] = useState<string>("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isEdit || postId === null) return;
    getPost(postId)
      .then((p) => {
        setTitle(p.title);
        setContent(p.content);
        setImageKey(p.image_key ?? "");
      })
      .catch((e) => setErr(String(e)));
  }, [isEdit, postId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    try {
      if (isEdit && postId !== null) {
        const updated = await updatePost(postId, {
          title,
          content,
          image_key: imageKey ? imageKey : null,
        });
        nav(`/posts/${updated.id}`);
      } else {
        const created = await createPost({
          title,
          content,
          image_key: imageKey ? imageKey : null,
        });
        nav(`/posts/${created.id}`);
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/">Back</Link>
      </div>

      <h1>{isEdit ? "Edit Post" : "New Post"}</h1>
      {err && <pre style={{ color: "crimson" }}>{err}</pre>}

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label>Title</label>
          <br />
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Content</label>
          <br />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} required />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>image_key (optional)</label>
          <br />
          <input value={imageKey} onChange={(e) => setImageKey(e.target.value)} />
        </div>

        <button type="submit">{isEdit ? "Save" : "Create"}</button>
      </form>
    </div>
  );
}
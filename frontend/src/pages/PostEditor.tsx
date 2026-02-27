import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createPost, getPost, updatePost } from "../lib/posts";
import { presignPut, uploadToS3, presignGet } from "../lib/uploads";

export default function PostEditor() {
  const { id } = useParams();
  const postId = id ? Number(id) : null;
  const isEdit = postId !== null && Number.isFinite(postId);

  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // S3 object key stored in DB
  const [imageKey, setImageKey] = useState<string>("");

  // Presigned GET url for preview
  const [imgUrl, setImgUrl] = useState<string>("");

  // Newly selected file
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  // Load post on edit
  useEffect(() => {
    if (!isEdit || postId === null) return;

    getPost(postId)
      .then((p) => {
        setTitle(p.title);
        setContent(p.content);
        setImageKey(p.image_key ?? "");
        setErr("");
      })
      .catch((e) => setErr(String(e)));
  }, [isEdit, postId]);

  // Fetch presigned GET url when imageKey changes
  useEffect(() => {
    let cancelled = false;

    setImgUrl("");

    async function run() {
      if (!imageKey) return;
      try {
        const { url } = await presignGet(imageKey);
        if (!cancelled) setImgUrl(url);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [imageKey]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;

    // Basic validation
    if (!f.type || !f.type.startsWith("image/")) {
      setErr("이미지 파일만 업로드 가능합니다.");
      e.target.value = "";
      return;
    }

    // Optional size limit (5MB)
    if (f.size > 5 * 1024 * 1024) {
      setErr("이미지는 5MB 이하만 업로드 가능합니다.");
      e.target.value = "";
      return;
    }

    setErr("");
    setFile(f);
  }

  async function uploadIfNeeded(): Promise<string | null> {
    // No new file: keep current imageKey
    if (!file) return imageKey ? imageKey : null;

    setUploading(true);
    try {
      const { key, url } = await presignPut(file.name, file.type);
      await uploadToS3(url, file);

      // Uploaded successfully
      setImageKey(key);
      setFile(null);
      setFileInputKey((k) => k + 1);
      return key;
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    try {
      const finalKey = await uploadIfNeeded();

      if (isEdit && postId !== null) {
        const updated = await updatePost(postId, {
          title,
          content,
          image_key: finalKey,
        });
        nav(`/posts/${updated.id}`);
      } else {
        const created = await createPost({
          title,
          content,
          image_key: finalKey,
        });
        nav(`/posts/${created.id}`);
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  function onClearImage() {
    if (uploading) return;
    setImageKey("");
    setImgUrl("");
    setFile(null);
    setFileInputKey((k) => k + 1);
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
          <label>image_key</label>
          <br />
          <input value={imageKey} readOnly />
          <button type="button" onClick={onClearImage} disabled={uploading} style={{ marginLeft: 8 }}>
            Clear
          </button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Image</label>
          <br />
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={uploading}
          />
          {uploading && <div>Uploading...</div>}
        </div>

        {imgUrl && (
          <div style={{ margin: "12px 0" }}>
            <img
              src={imgUrl}
              alt="preview"
              style={{ maxWidth: 520, width: "100%", borderRadius: 8 }}
            />
          </div>
        )}

        <button type="submit" disabled={uploading}>
          {isEdit ? "Save" : "Create"}
        </button>
      </form>
    </div>
  );
}
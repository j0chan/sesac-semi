import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import StatusPanel from "../components/ui/StatusPanel";
import { isLoggedIn } from "../lib/auth";
import { toErrorMessage } from "../lib/errors";
import { createPost, getPost, updatePost } from "../lib/posts";
import { presignGet, presignPut, uploadToS3 } from "../lib/uploads";
import type { AsyncState } from "../types/ui";

export default function PostEditor() {
  const { id } = useParams();
  const postId = id ? Number(id) : null;
  const isEdit = typeof id === "string";
  const validPostId = postId !== null && Number.isFinite(postId);

  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageKey, setImageKey] = useState("");

  const [state, setState] = useState<AsyncState>(isEdit ? "loading" : "success");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");

  const [serverImageUrl, setServerImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (loggedIn) return;

    nav("/login", {
      replace: true,
      state: {
        from: isEdit && validPostId ? `/posts/${postId}/edit` : "/posts/new",
        message: "게시글 작성/수정은 로그인 후 이용할 수 있습니다.",
      },
    });
  }, [isEdit, loggedIn, nav, postId, validPostId]);

  const loadPost = useCallback(async () => {
    if (!isEdit) {
      setState("success");
      return;
    }

    if (!validPostId || postId === null) {
      setState("error");
      setError("유효하지 않은 게시글 ID입니다.");
      return;
    }

    setState("loading");
    setError("");

    try {
      const post = await getPost(postId);
      setTitle(post.title);
      setContent(post.content);
      setImageKey(post.image_key ?? "");
      setState("success");
    } catch (err) {
      setError(toErrorMessage(err));
      setState("error");
    }
  }, [isEdit, postId, validPostId]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      if (!imageKey) {
        setServerImageUrl("");
        setImageError("");
        return;
      }

      setImageError("");

      try {
        const { url } = await presignGet(imageKey);
        if (!cancelled) {
          setServerImageUrl(url);
        }
      } catch (err) {
        if (!cancelled) {
          setImageError(toErrorMessage(err));
          setServerImageUrl("");
        }
      }
    }

    void loadImage();

    return () => {
      cancelled = true;
    };
  }, [imageKey]);

  useEffect(() => {
    if (!file) {
      setLocalImageUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalImageUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const previewUrl = useMemo(() => localImageUrl || serverImageUrl, [localImageUrl, serverImageUrl]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      event.target.value = "";
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setError("이미지는 5MB 이하만 업로드 가능합니다.");
      event.target.value = "";
      return;
    }

    setError("");
    setFile(selected);
  }

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) {
      return imageKey || null;
    }

    setUploading(true);

    try {
      const { key, url } = await presignPut(file.name, file.type);
      await uploadToS3(url, file);

      setImageKey(key);
      setFile(null);
      setFileInputKey((prev) => prev + 1);
      return key;
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("제목과 본문을 입력해 주세요.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const finalKey = await uploadIfNeeded();

      if (isEdit && validPostId && postId !== null) {
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
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function onClearImage() {
    if (uploading || submitting) return;

    setFile(null);
    setImageKey("");
    setServerImageUrl("");
    setLocalImageUrl("");
    setImageError("");
    setFileInputKey((prev) => prev + 1);
  }

  if (!loggedIn) {
    return (
      <section className="page screen-enter">
        <StatusPanel message="로그인 페이지로 이동 중입니다." state="loading" title="잠시만 기다려 주세요" />
      </section>
    );
  }

  return (
    <section className="page screen-enter">
      <PageHeader
        subtitle={isEdit ? "기존 게시글을 수정하고 저장합니다." : "새 게시글과 이미지를 등록합니다."}
        title={isEdit ? "게시글 수정" : "새 게시글 작성"}
      />

      {error ? <StatusPanel message={error} state="error" title="저장 작업을 완료하지 못했습니다." /> : null}

      {state === "loading" ? (
        <div className="layout-grid" aria-hidden="true">
          <div className="editor-form card">
            <div className="skeleton skeleton--line" style={{ width: "38%" }} />
            <div className="skeleton" style={{ height: 44 }} />
            <div className="skeleton skeleton--line" style={{ width: "52%" }} />
            <div className="skeleton" style={{ height: 240 }} />
          </div>
          <aside className="editor-preview card">
            <div className="skeleton skeleton--image" />
            <div className="skeleton skeleton--line" style={{ width: "66%" }} />
          </aside>
        </div>
      ) : null}

      {state === "error" ? (
        <StatusPanel message={error} onRetry={loadPost} state="error" title="게시글 정보를 불러오지 못했습니다." />
      ) : null}

      {state === "success" ? (
        <div className="layout-grid">
          <form className="editor-form card" onSubmit={onSubmit}>
            <div className="form-stack editor-form__content">
              <div className="field">
                <label htmlFor="post-title">제목</label>
                <input
                  id="post-title"
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="게시글 제목을 입력하세요"
                  required
                  value={title}
                />
              </div>

              <div className="field">
                <label htmlFor="post-content">본문</label>
                <textarea
                  id="post-content"
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="공지나 공유할 내용을 입력하세요"
                  required
                  value={content}
                />
              </div>
            </div>

            <div className="editor-form__footer">
              <div className="actions-row actions-row--end">
                <Link className="btn btn--secondary" to={isEdit && validPostId ? `/posts/${postId}` : "/"}>
                  취소
                </Link>
                <Button type="button" variant="ghost" onClick={onClearImage}>
                  이미지 제거
                </Button>
                <Button
                  loading={submitting || uploading}
                  loadingLabel={uploading ? "이미지 업로드 중..." : "저장 중..."}
                  type="submit"
                >
                  {isEdit ? "수정 저장" : "게시글 등록"}
                </Button>
              </div>
            </div>
          </form>

          <aside className="editor-preview card">
            <div className="field">
              <label htmlFor="image-upload">이미지 업로드</label>
              <div className="file-input">
                <input
                  accept="image/*"
                  id="image-upload"
                  key={fileInputKey}
                  onChange={onFileChange}
                  type="file"
                />
              </div>
              <p className="field-help">JPG, PNG 권장. 최대 5MB까지 업로드할 수 있습니다.</p>
            </div>

            <div className="preview-media">
              {previewUrl ? (
                <img alt="첨부 이미지 미리보기" src={previewUrl} />
              ) : (
                <div
                  style={{
                    alignItems: "center",
                    color: "var(--color-text-muted)",
                    display: "flex",
                    height: "100%",
                    justifyContent: "center",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  업로드한 이미지가 여기에 미리보기로 표시됩니다.
                </div>
              )}
            </div>

            {imageError ? <p className="notice notice--error">첨부 이미지를 확인할 수 없습니다. {imageError}</p> : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

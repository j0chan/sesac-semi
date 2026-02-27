import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import StatusPanel from "../components/ui/StatusPanel";
import { isLoggedIn } from "../lib/auth";
import { toErrorMessage } from "../lib/errors";
import { deletePost, getPost } from "../lib/posts";
import { presignGet } from "../lib/uploads";
import type { Post } from "../types";
import type { AsyncState } from "../types/ui";

export default function PostDetail() {
  const { id } = useParams();
  const postId = Number(id);
  const nav = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [state, setState] = useState<AsyncState>("loading");
  const [error, setError] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [imgState, setImgState] = useState<AsyncState>("idle");
  const [imgError, setImgError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loggedIn = isLoggedIn();
  const validPostId = Number.isFinite(postId);

  const loadPost = useCallback(async () => {
    if (!validPostId) return;

    setState("loading");
    setError("");

    try {
      const row = await getPost(postId);
      setPost(row);
      setState("success");
    } catch (err) {
      setError(toErrorMessage(err));
      setState("error");
    }
  }, [postId, validPostId]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      if (!post?.image_key) {
        setImgState("idle");
        setImgUrl("");
        setImgError("");
        return;
      }

      setImgState("loading");
      setImgError("");

      try {
        const { url } = await presignGet(post.image_key);

        if (!cancelled) {
          setImgUrl(url);
          setImgState("success");
        }
      } catch (err) {
        if (!cancelled) {
          setImgError(toErrorMessage(err));
          setImgState("error");
        }
      }
    }

    void loadImage();

    return () => {
      cancelled = true;
    };
  }, [post?.image_key]);

  function onEdit() {
    if (loggedIn) {
      nav(`/posts/${postId}/edit`);
      return;
    }

    nav("/login", {
      state: {
        from: `/posts/${postId}/edit`,
        message: "게시글 수정은 로그인 후 이용할 수 있습니다.",
      },
    });
  }

  async function onDelete() {
    if (!loggedIn) {
      nav("/login", {
        state: {
          from: `/posts/${postId}`,
          message: "게시글 삭제는 로그인 후 이용할 수 있습니다.",
        },
      });
      return;
    }

    if (!window.confirm("이 게시글을 삭제하시겠습니까?")) {
      return;
    }

    setDeleting(true);

    try {
      await deletePost(postId);
      nav("/");
    } catch (err) {
      setError(toErrorMessage(err));
      setState("error");
    } finally {
      setDeleting(false);
    }
  }

  if (!validPostId) {
    return (
      <section className="page screen-enter">
        <PageHeader
          actions={
            <Link className="btn btn--secondary" to="/">
              목록으로
            </Link>
          }
          subtitle="요청한 게시글 ID를 확인해 주세요."
          title="잘못된 접근"
        />
        <StatusPanel message="유효하지 않은 게시글 ID입니다." state="error" title="페이지를 열 수 없습니다." />
      </section>
    );
  }

  return (
    <section className="page screen-enter">
      <PageHeader
        actions={
          <div className="detail-actions">
            <Link className="btn btn--secondary" to="/">
              목록으로
            </Link>
            <Button variant="ghost" onClick={onEdit}>
              수정
            </Button>
            <Button loading={deleting} variant="danger" onClick={onDelete}>
              삭제
            </Button>
          </div>
        }
        subtitle="게시글 본문과 첨부 이미지를 확인할 수 있습니다."
        title="게시글 상세"
      />

      {state === "loading" ? (
        <article className="card detail-article" aria-hidden="true">
          <div className="skeleton skeleton--line" style={{ width: "42%" }} />
          <div className="skeleton skeleton--image" />
          <div className="skeleton skeleton--line" style={{ width: "96%" }} />
          <div className="skeleton skeleton--line" style={{ width: "88%" }} />
          <div className="skeleton skeleton--line" style={{ width: "75%" }} />
        </article>
      ) : null}

      {state === "error" ? (
        <StatusPanel message={error} onRetry={loadPost} state="error" title="게시글을 불러오지 못했습니다." />
      ) : null}

      {state === "success" && post ? (
        <article className="card detail-article">
          <h2 className="detail-title">{post.title}</h2>

          {post.image_key ? (
            <>
              {imgState === "loading" ? <div className="skeleton skeleton--image" /> : null}

              {imgState === "error" ? (
                <p className="notice notice--error">첨부 이미지를 불러오지 못했습니다. {imgError}</p>
              ) : null}

              {imgUrl && imgState === "success" ? (
                <img alt="게시글 첨부 이미지" className="detail-image" src={imgUrl} />
              ) : null}
            </>
          ) : null}

          <p className="detail-content">{post.content}</p>
        </article>
      ) : null}
    </section>
  );
}

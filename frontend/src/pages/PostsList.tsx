import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import StatusPanel from "../components/ui/StatusPanel";
import { isLoggedIn } from "../lib/auth";
import { toErrorMessage } from "../lib/errors";
import { listPosts } from "../lib/posts";
import type { Post } from "../types";
import type { AsyncState } from "../types/ui";

const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

function excerpt(content: string, max = 140) {
  const text = content.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function PostsList() {
  const nav = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [state, setState] = useState<AsyncState>("loading");
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [hasNext, setHasNext] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const loggedIn = isLoggedIn();

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        const skip = (page - 1) * pageSize;
        const rows = await listPosts(skip, pageSize + 1);

        if (cancelled) return;

        const next = rows.length > pageSize;
        setHasNext(next);
        setPosts(next ? rows.slice(0, pageSize) : rows);
        setState("success");
      } catch (err) {
        if (cancelled) return;
        setError(toErrorMessage(err));
        setState("error");
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, reloadTick]);

  function onCreatePost() {
    if (loggedIn) {
      nav("/posts/new");
      return;
    }

    nav("/login", {
      state: {
        from: "/posts/new",
        message: "게시글 작성은 로그인 후 이용할 수 있습니다.",
      },
    });
  }

  function onRetry() {
    setError("");
    setState("loading");
    setReloadTick((prev) => prev + 1);
  }

  function onPrevPage() {
    if (page <= 1) return;
    setError("");
    setState("loading");
    setPage((prev) => Math.max(1, prev - 1));
  }

  function onNextPage() {
    if (!hasNext) return;
    setError("");
    setState("loading");
    setPage((prev) => prev + 1);
  }

  function onPageSizeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextSize = Number(event.target.value);
    if (!PAGE_SIZE_OPTIONS.includes(nextSize as (typeof PAGE_SIZE_OPTIONS)[number])) return;

    setError("");
    setPosts([]);
    setHasNext(false);
    setState("loading");
    setPage(1);
    setPageSize(nextSize);
  }

  return (
    <section className="page screen-enter">
      <PageHeader
        actions={<Button onClick={onCreatePost}>새 글 작성</Button>}
        subtitle="팀의 공지와 기록을 모아보는 게시판"
        title="사내 게시판"
      />

      {!loggedIn ? <p className="notice notice--info">로그인하면 새 글 작성과 편집 기능을 사용할 수 있습니다.</p> : null}

      <section className="card list-toolbar" aria-label="게시글 페이지 제어">
        <div className="list-toolbar__left">
          <span>페이지 {page}</span>
          <span className="list-toolbar__dot" aria-hidden="true">
            ·
          </span>
          <span>{pageSize}개씩 보기</span>
        </div>

        <div className="list-toolbar__right">
          <label htmlFor="page-size">페이지당</label>
          <select className="list-toolbar__select" id="page-size" onChange={onPageSizeChange} value={pageSize}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <Button disabled={page <= 1 || state === "loading"} size="sm" variant="secondary" onClick={onPrevPage}>
            이전
          </Button>
          <Button disabled={!hasNext || state === "loading"} size="sm" variant="secondary" onClick={onNextPage}>
            다음
          </Button>
        </div>
      </section>

      {state === "loading" ? (
        <div className="stack" aria-hidden="true">
          <div className="skeleton skeleton--hero" />
          <div className="skeleton skeleton--card" />
          <div className="skeleton skeleton--card" />
          <div className="skeleton skeleton--card" />
        </div>
      ) : null}

      {state === "error" ? (
        <StatusPanel message={error} onRetry={onRetry} state="error" title="게시글 목록을 불러오지 못했습니다." />
      ) : null}

      {state === "success" && posts.length === 0 ? (
        page === 1 ? (
          <EmptyState
            actionLabel="첫 게시글 작성"
            message="아직 등록된 게시글이 없습니다. 첫 소식을 등록해 팀 피드를 시작하세요."
            onAction={onCreatePost}
            title="게시글이 비어 있습니다"
          />
        ) : (
          <EmptyState
            actionLabel="이전 페이지"
            message="현재 페이지에는 게시글이 없습니다. 이전 페이지로 이동해 주세요."
            onAction={onPrevPage}
            title="조회할 게시글이 없습니다"
          />
        )
      ) : null}

      {state === "success" && posts.length > 0 ? (
        <div className="posts-feed stagger-list">
          {posts.map((post, index) => (
            <Link className={`post-card${index === 0 ? " post-card--featured" : ""}`} key={post.id} to={`/posts/${post.id}`}>
              <p className="post-card__meta">글 #{post.id}</p>
              <h2 className="post-card__title">{post.title}</h2>
              <p className="post-card__excerpt">{excerpt(post.content, index === 0 ? 240 : 160)}</p>
              {post.image_key ? <span className="badge">이미지 첨부</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

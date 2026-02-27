import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import { login } from "../lib/auth";
import { toErrorMessage } from "../lib/errors";
import type { LoginRedirectState } from "../types";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("test1234");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectState = (location.state as LoginRedirectState | null) ?? null;
  const nextPath = redirectState?.from && redirectState.from !== "/login" ? redirectState.from : "/";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      nav(nextPath, { replace: true });
    } catch (err) {
      setError(toErrorMessage(err, "로그인에 실패했습니다. 계정 정보를 확인해 주세요."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page screen-enter">
      <div className="login-layout">
        <aside className="card login-story">
          <span className="login-story__eyebrow">Internal Magazine</span>
          <h1 className="login-story__title">팀의 지식을 한 화면에서 공유하세요.</h1>
          <p className="login-story__desc">
            게시글 작성, 이미지 첨부, 상세 조회까지 한 흐름으로 관리할 수 있도록 구성된 사내 포털입니다.
          </p>
          <ul className="login-story__list">
            <li>공지와 회의록을 매거진 스타일로 빠르게 확인</li>
            <li>이미지 첨부와 본문 편집을 하나의 폼에서 처리</li>
            <li>로그인 상태에 따라 작성/수정 권한을 명확히 안내</li>
          </ul>
        </aside>

        <div className="card login-panel">
          <PageHeader subtitle="계정 정보를 입력하고 사내 보드에 접속하세요." title="로그인" />

          {redirectState?.message ? <p className="notice notice--info">{redirectState.message}</p> : null}
          {error ? <p className="notice notice--error">{error}</p> : null}

          <form className="form-stack" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="login-email">이메일</label>
              <input
                autoComplete="username"
                id="login-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">비밀번호</label>
              <input
                autoComplete="current-password"
                id="login-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호"
                required
                type="password"
                value={password}
              />
            </div>

            <Button loading={submitting} loadingLabel="로그인 중..." type="submit">
              로그인
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

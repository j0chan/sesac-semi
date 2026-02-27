import type { MouseEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUserId, isLoggedIn, logout } from "../../lib/auth";

export default function AppShell() {
  const nav = useNavigate();
  const location = useLocation();

  const loggedIn = isLoggedIn();
  const userId = getCurrentUserId();
  const isLoginPage = location.pathname === "/login";

  function onLogout() {
    logout();
    nav("/login", {
      state: {
        message: "로그아웃되었습니다.",
      },
    });
  }

  function onCreateLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (loggedIn) return;
    event.preventDefault();
    nav("/login", {
      state: {
        from: "/posts/new",
        message: "게시글 작성은 로그인 후 이용할 수 있습니다.",
      },
    });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container app-header__inner">
          <Link className="brand" to="/">
            <span className="brand__name">SESAC BOARD</span>
            <span className="brand__desc">Internal Magazine Workspace</span>
          </Link>

          <nav className="app-nav" aria-label="주요 메뉴">
            <NavLink className={({ isActive }) => `app-nav__link${isActive ? " is-active" : ""}`} end to="/">
              게시글
            </NavLink>
          </nav>

          <div className="app-header__actions">
            {!isLoginPage ? (
              <Link className="btn btn--primary btn--sm" onClick={onCreateLinkClick} to="/posts/new">
                새 글 작성
              </Link>
            ) : null}

            {loggedIn ? (
              <div className="user-menu">
                <button
                  aria-haspopup="menu"
                  className="status-pill status-pill--online user-menu__trigger"
                  type="button"
                >
                  {userId ?? "알 수 없음"}
                </button>

                <ul className="user-menu__panel" role="menu">
                  <li role="none">
                    <button className="user-menu__item" onClick={onLogout} role="menuitem" type="button">
                      로그아웃
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <span className="status-pill status-pill--offline">게스트</span>
                <Link className="btn btn--secondary btn--sm" to="/login">
                  로그인
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

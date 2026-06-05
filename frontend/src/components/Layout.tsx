import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { NavSearch } from "./NavSearch";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "active" : undefined;

export function Layout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();

  return (
    <>
      <nav className="navbar">
        <div className="container nav-content">
          <NavLink to="/" className="logo" end>
            <span className="logo-name">槑头槑脑</span>
            <span className="logo-dot" aria-hidden="true" />
            <span className="logo-label">博客</span>
          </NavLink>
          <div className="nav-links">
            <NavSearch />
            <NavLink to="/" className={linkClass} end>
              首页
            </NavLink>
            <NavLink to="/about" className={linkClass}>
              关于
            </NavLink>
            {!loading && user ? (
              <div className="nav-auth-group">
                <Link to="/profile" className="nav-user-badge nav-user-link">
                  {user.nickname || user.username}
                </Link>
                <button type="button" className="nav-btn nav-btn-ghost" onClick={logout}>
                  退出
                </button>
              </div>
            ) : (
              <div className="nav-auth-group">
                <Link to="/login" className="nav-btn nav-btn-ghost">
                  登录
                </Link>
                <Link to="/register" className="nav-btn nav-btn-accent">
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} 个人博客 | study & life | blog</p>
        </div>
      </footer>
    </>
  );
}

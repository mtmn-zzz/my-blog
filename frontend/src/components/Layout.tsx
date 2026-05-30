import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "active" : undefined;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className="navbar">
        <div className="container nav-content">
          <NavLink to="/" className="logo" end>
            槑头槑脑 · 博客
          </NavLink>
          <div className="nav-links">
            <NavLink to="/" className={linkClass} end>
              首页
            </NavLink>
            <NavLink to="/about" className={linkClass}>
              关于
            </NavLink>
            <button className="btn-outline" onClick={() =>alert("🐣 当前为演示版本，后续将接入真实JWT鉴权 + 评论点赞功能！\n敬请期待第二周迭代。")}>
              登录体验
              </button>
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="footer">
        <div className="container">
          <p>
            © {new Date().getFullYear()} 个人博客 | study & life | blog
          </p>
        </div>
      </footer>
    </>
  );
}

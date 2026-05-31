import { Link } from "react-router-dom";

export function About() {
  return (
    <div className="container" style={{ padding: "2rem 0 3rem" }}>
      <p style={{ marginBottom: "1.5rem" }}>
        <Link to="/" className="read-more">
          ← 返回首页
        </Link>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 280px) 1fr",
          gap: "2rem",
          alignItems: "start",
        }}
        className="about-page-grid"
      >
        <div className="about-card" style={{ position: "sticky", top: "88px" }}>
          <img
            className="avatar"
            src="/assets/cb95d0db32fc6977d2a288bd3ccc0252.png"
            alt="头像"
            onError={(e) => {
              e.currentTarget.src = "/avatar.svg";
            }}
          />
          <div className="about-name">槑头槑脑</div>
          <div className="about-bio">浙江大学学生 / 计算机爱好者</div>
          <div className="section-title">联系我</div>
          <div style={{ fontSize: "0.9rem", color: "#4b5563", lineHeight: 1.7 }}>
            <div>2484830674@qq.com</div>
            <div>
              GitHub:{" "}
              <a
                href="https://github.com/mtmn-zzz"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#3b82f6" }}
              >
                mtmn-zzz
              </a>
            </div>
          </div>
        </div>

        <div>
          <section className="post-card" style={{ marginBottom: "1.5rem" }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>
              个人介绍
            </h2>
            <p style={{ color: "#334155", marginTop: "0.75rem" }}>
              hello！大家好，我是槑头槑脑（这是我的网名），欢迎来到我的博客！
              接下来我会在blog中分享一些自己的生活和学习笔记等等，以后实力更强大了我也会分享一些自己做的项目
              谢谢你的关注！！！
            </p>
          </section>

          <section className="post-card" style={{ marginBottom: "1.5rem" }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>
              兴趣方向
            </h2>
            <div className="interest-tags" style={{ marginTop: "0.75rem" }}>
              <span className="tag">可视化技术</span>
            </div>
          </section>

          <section className="post-card">
            <h2 className="section-title" style={{ marginTop: 0 }}>
              经历
            </h2>
            <div className="experience-item" style={{ marginTop: "0.75rem" }}>
              <div className="exp-title">浙江大学 · 计算机科学与技术学院</div>
              <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                2025 — 至今 | 计算机科学与技术专业
              </div>
            </div>
            <div className="experience-item">
              <div className="exp-title">独立开发者项目</div>
              <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                个人博客ing
              </div>
            </div>
            <div className="experience-item">
              <div className="exp-title">研究方向</div>
              <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                暂无...
              </div>
            </div>
          </section>

          <div
            style={{
              marginTop: "1.5rem",
              fontSize: "0.85rem",
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "1rem",
              color: "#475569",
            }}
          >
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .about-page-grid {
            grid-template-columns: 1fr !important;
          }
          .about-page-grid .about-card {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}

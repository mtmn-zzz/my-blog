import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchArticles } from "../api/client";
import type { ArticleListItem } from "../api/types";
import { getReadTime } from "../utils/readTime";

const MUSIC_SRC =
  "/assets/" +
  encodeURIComponent("Daniel Caesar _ H_E_R_ - Best Part(feat_ H_E_R_).mp3");

const videoStyle = {
  maxWidth: "300px",
  width: "100%",
  height: "auto",
  display: "block",
  margin: "10px 0",
  borderRadius: "12px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
} as const;

const sectionHeadingStyle = {
  marginBottom: "1rem",
  fontWeight: 600,
} as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("zh-CN");
  } catch {
    return iso;
  }
}

export function Home() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchArticles()
      .then((data) => {
        if (!cancelled) setArticles(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-glow hero-glow-left" aria-hidden="true" />
        <div className="hero-glow hero-glow-right" aria-hidden="true" />
        <div className="container hero-inner">
          <p className="hero-eyebrow">Welcome to my blog</p>
          <h1 className="hero-title">记录成长 · 分享思考</h1>
          <p className="hero-subtitle">
            专注
            <span className="hero-highlight">生活学习</span>
            {" & "}
            <span className="hero-highlight">AI 探索</span>
            <span className="hero-subtitle-divider">|</span>
            从0到1 构建自己的博客
          </p>
        </div>
      </section>

      <main className="container">
      <div className="grid-2cols">
        <div>
          <h3 style={sectionHeadingStyle}>🎼 分享喜欢的音乐</h3>
          <div className="audio_button">
            <audio id="myaudio" controls>
              <source src={MUSIC_SRC} />
            </audio>
          </div>

          <h3 style={sectionHeadingStyle}>❤️ 我的入坑代码</h3>
          <div className="video_button">
            <video
              controls
              src="/assets/heart.mp4"
              style={videoStyle}
              autoPlay
              muted
              loop
            />
          </div>

          <h3 style={sectionHeadingStyle}>📝 最新发布</h3>
          <div id="articlesList">
            {loading && <p className="muted">加载中…</p>}
            {error && <div className="error-box">{error}</div>}
            {!loading && !error && articles.length === 0 && (
              <p className="muted">暂无文章，敬请期待。</p>
            )}
            {articles.map((article) => (
              <article key={article.id} className="post-card">
                <h3 className="post-title">{article.title}</h3>
                <div className="post-meta">
                  <span>📅 {formatDate(article.created_at)}</span>
                  <span> ⌛ {getReadTime(article.content)} 分钟阅读</span>
                  <span> ❤️ {article.like_count ?? 0} 赞</span>
                </div>
                <div className="post-summary">{article.summary}</div>
                <Link to={`/articles/${article.id}`} className="post-read-btn">
                  阅读全文 →
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div>
          <div className="about-card">
            <img
              className="avatar"
              src="/assets/cb95d0db32fc6977d2a288bd3ccc0252.png"
              alt="头像"
              onError={(e) => {
                e.currentTarget.src = "/avatar.svg";
              }}
            />
            <div className="about-name">槑头槑脑</div>
            <div className="about-bio">计算机学习者 / AI爱好者</div>

            <div className="section-title">✨ 兴趣领域</div>
            <div className="interest-tags">
              <span className="tag">旅游</span>
              <span className="tag">摄影</span>
              <span className="tag">音乐</span>
              <span className="tag">可视化技术</span>
              <span className="tag">独立产品</span>
            </div>

            <div className="section-title">📌 经历</div>
            <div className="experience-item">
              <div className="exp-title">
                · 浙江大学学生 计算机科学与技术学院
              </div>
              <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                2025 - 至今 | 计算机科学与技术专业
              </div>
            </div>
            <div className="experience-item">
              <div className="exp-title">· 独立开发者项目</div>
              <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                个人博客ing/wait to do / wait to do
              </div>
            </div>
            <div className="experience-item">
              <div className="exp-title">· 计算机本科 @ 浙江大学</div>
              <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                研究方向: 暂无
              </div>
            </div>

            <div className="section-title">📬 联系我</div>
            <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
              <span>📧 2484830674@qq.com</span>
              <span>🐙 github/mtmn-zzz</span>
            </div>
            <div
              style={{
                marginTop: "1rem",
                fontSize: "0.8rem",
                background: "#f8fafc",
                padding: "0.8rem",
                borderRadius: "1rem",
              }}
            >
              💡 “构建会思考的博客 —— ”
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkDown from "react-markdown"
import { fetchArticle } from "../api/client";
import type { ArticleDetail as ArticleDetailType } from "../api/types";
import { getReadTime } from "../utils/readTime";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

export function ArticleDetail() {
  const { id } = useParams();
  const numericId = id ? Number(id) : NaN;
  const [article, setArticle] = useState<ArticleDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(numericId)) {
      setError("无效的文章 ID");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchArticle(numericId)
      .then((data) => {
        if (!cancelled) setArticle(data);
      })
      .catch(() => {
        if (!cancelled) setError("文章不存在或加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [numericId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: "2rem 0" }}>
        <p className="muted">加载中…</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container" style={{ padding: "2rem 0" }}>
        <div className="error-box">{error}</div>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/" className="read-more">
            ← 返回首页
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "2rem 0 3rem" }}>
      <p style={{ marginBottom: "1rem" }}>
        <Link to="/" className="read-more">
          ← 返回列表
        </Link>
      </p>
      <article className="post-card" style={{ marginBottom: "1.5rem" }}>
        <h1 className="post-title" style={{ fontSize: "1.75rem" }}>
          {article.title}
        </h1>
        <div className="post-meta">
          <span>发布于 {formatDate(article.created_at)}</span>
          <span>更新于 {formatDate(article.updated_at)}</span>
          <span> ⌛ {getReadTime(article.content)} 分钟阅读</span>
        </div>
      </article>
      <div className="article-body markdown-body">
        <ReactMarkDown>{article.content}</ReactMarkDown>
      </div>
    </div>
  );
}

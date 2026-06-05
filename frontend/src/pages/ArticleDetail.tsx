import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkDown from "react-markdown";
import { ArticleEngagement } from "../components/ArticleEngagement";
import { ArticleAiSummary } from "../components/ArticleAiSummary";
import { fetchArticle } from "../api/client";
import type { ArticleDetail as ArticleDetailType } from "../api/types";
import { getReadTime } from "../utils/readTime";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
      <div className="article-page">
        <div className="article-container">
          <p className="article-loading">加载中…</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="article-page">
        <div className="article-container">
          <div className="article-error">{error}</div>
          <Link to="/" className="article-back">
            <span className="article-back-icon">←</span>
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const showUpdated = article.updated_at !== article.created_at;

  return (
    <div className="article-page">
      <div className="article-container">
        <Link to="/" className="article-back">
          <span className="article-back-icon">←</span>
          返回列表
        </Link>

        <article className="article-detail">
          <header className="article-header">
            <h1 className="article-title">{article.title}</h1>
            <ArticleAiSummary
              article={article}
              onSummaryUpdate={(summary) => setArticle((prev) => (prev ? { ...prev, summary } : prev))}
            />
            <div className="article-meta">
              <span className="meta-chip">
                📅 {formatDate(article.created_at)}
              </span>
              {showUpdated && (
                <span className="meta-chip">
                  ✏️ 更新于 {formatDate(article.updated_at)}
                </span>
              )}
              <span className="meta-chip">
                ⌛ {getReadTime(article.content)} 分钟阅读
              </span>
            </div>
          </header>

          <div className="article-divider" />

          <div className="article-body markdown-body">
            <ReactMarkDown>{article.content}</ReactMarkDown>
          </div>

          <div className="article-engagement-wrap">
            <ArticleEngagement articleId={article.id} />
          </div>
        </article>
      </div>
    </div>
  );
}

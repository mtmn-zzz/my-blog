import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchArticles } from "../api/client";
import type { ArticleListItem } from "../api/types";
import { getReadTime } from "../utils/readTime";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("zh-CN");
  } catch {
    return iso;
  }
}

export function Search() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";

  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setArticles([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchArticles(q)
      .then((data) => {
        if (!cancelled) setArticles(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "搜索失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="search-page">
      <div className="container search-container">
        <Link to="/" className="article-back">
          <span className="article-back-icon">←</span>
          返回首页
        </Link>

        <h1 className="search-heading">搜索文章</h1>
        {q ? (
          <p className="search-subheading">
            关键词「<span className="search-keyword">{q}</span>」的搜索结果
          </p>
        ) : (
          <p className="search-subheading">在顶部导航栏输入关键词开始搜索</p>
        )}

        {!q && (
          <div className="search-empty">
            <p>试试搜索标题、摘要或正文中的内容</p>
          </div>
        )}

        {q && loading && <p className="muted search-status">搜索中…</p>}
        {q && error && <div className="error-box search-status">{error}</div>}
        {q && !loading && !error && articles.length === 0 && (
          <p className="muted search-status">没有找到相关文章</p>
        )}

        <div className="search-results">
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
    </div>
  );
}

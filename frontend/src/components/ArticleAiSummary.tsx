import { useEffect, useRef, useState } from "react";
import { summarizeArticle } from "../api/client";
import type { ArticleDetail } from "../api/types";

type Props = {
  article: ArticleDetail;
  onSummaryUpdate: (summary: string) => void;
};

export function ArticleAiSummary({ article, onSummaryUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestedRef = useRef(false);

  const hasSummary = Boolean(article.summary?.trim());

  useEffect(() => {
    if (hasSummary || requestedRef.current || !article.content?.trim()) {
      return;
    }
    requestedRef.current = true;
    setLoading(true);
    setError(null);

    summarizeArticle(article.id)
      .then((updated) => {
        if (updated.summary?.trim()) {
          onSummaryUpdate(updated.summary);
        }
      })
      .catch((e: Error) => {
        setError(e.message || "AI 摘要生成失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [article.id, article.content, hasSummary, onSummaryUpdate]);

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      const updated = await summarizeArticle(article.id);
      onSummaryUpdate(updated.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 摘要生成失败");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !hasSummary) {
    return (
      <div className="ai-summary ai-summary-loading">
        <span className="ai-summary-badge">✨ AI 摘要</span>
        <p>正在分析文章内容，生成摘要…</p>
      </div>
    );
  }

  if (!hasSummary && error) {
    return (
      <div className="ai-summary ai-summary-error">
        <span className="ai-summary-badge">✨ AI 摘要</span>
        <p>{error}</p>
        <button type="button" className="ai-summary-btn" onClick={handleRegenerate}>
          重试
        </button>
      </div>
    );
  }

  if (!hasSummary) {
    return null;
  }

  return (
    <div className="ai-summary">
      <div className="ai-summary-header">
        <span className="ai-summary-badge">✨ AI 摘要</span>
        <button
          type="button"
          className="ai-summary-btn"
          onClick={handleRegenerate}
          disabled={loading}
        >
          {loading ? "生成中…" : "重新生成"}
        </button>
      </div>
      <p className="ai-summary-text">{article.summary}</p>
    </div>
  );
}

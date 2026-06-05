import type { ArticleDetail, ArticleListItem } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      try {
        message = await res.text();
      } catch {
        // ignore
      }
    }
    throw new Error(message || "请求失败");
  }
  return res.json() as Promise<T>;
}

export async function fetchArticles(q?: string): Promise<ArticleListItem[]> {
  const params = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const res = await fetch(`${BASE_URL}/articles${params}`);
  return parseJson<ArticleListItem[]>(res);
}

export async function fetchArticle(id: number): Promise<ArticleDetail> {
  const res = await fetch(`${BASE_URL}/articles/${id}`);
  return parseJson<ArticleDetail>(res);
}

export async function summarizeArticle(id: number): Promise<ArticleDetail> {
  const res = await fetch(`${BASE_URL}/articles/${id}/summarize`, {
    method: "POST",
  });
  return parseJson<ArticleDetail>(res);
}

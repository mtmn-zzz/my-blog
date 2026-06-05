import type { ArticleDetail, ArticleListItem } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function fetchArticles(): Promise<ArticleListItem[]> {
  const res = await fetch(`${BASE_URL}/articles`);
  return parseJson<ArticleListItem[]>(res);
}

export async function fetchArticle(id: number): Promise<ArticleDetail> {
  const res = await fetch(`${BASE_URL}/articles/${id}`);
  return parseJson<ArticleDetail>(res);
}

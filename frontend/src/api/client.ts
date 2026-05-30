import type { ArticleDetail, ArticleListItem } from "./types";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function fetchArticles(): Promise<ArticleListItem[]> {
  const res = await fetch("/api/articles");
  return parseJson<ArticleListItem[]>(res);
}

export async function fetchArticle(id: number): Promise<ArticleDetail> {
  const res = await fetch(`/api/articles/${id}`);
  return parseJson<ArticleDetail>(res);
}

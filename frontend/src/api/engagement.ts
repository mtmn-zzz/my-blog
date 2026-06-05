import { getStoredToken } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export type LikeStatus = {
  count: number;
  liked: boolean;
};

export type CommentAuthor = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

export type Comment = {
  id: number;
  content: string;
  created_at: string;
  user: CommentAuthor;
  replies: Comment[];
};

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message || "请求失败");
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function fetchLikeStatus(articleId: number): Promise<LikeStatus> {
  const res = await fetch(`${BASE_URL}/articles/${articleId}/likes`, {
    headers: authHeaders(),
  });
  return parseJson<LikeStatus>(res);
}

export async function toggleLike(articleId: number): Promise<LikeStatus> {
  const res = await fetch(`${BASE_URL}/articles/${articleId}/like`, {
    method: "POST",
    headers: authHeaders(),
  });
  return parseJson<LikeStatus>(res);
}

export async function fetchComments(articleId: number): Promise<Comment[]> {
  const res = await fetch(`${BASE_URL}/articles/${articleId}/comments`);
  return parseJson<Comment[]>(res);
}

export async function postComment(
  articleId: number,
  content: string,
  parentId?: number,
): Promise<Comment> {
  const res = await fetch(`${BASE_URL}/articles/${articleId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ content, parent_id: parentId ?? null }),
  });
  return parseJson<Comment>(res);
}

export async function deleteComment(commentId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await parseJson<void>(res);
}

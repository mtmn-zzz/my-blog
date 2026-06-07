import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteComment,
  fetchComments,
  fetchLikeStatus,
  postComment,
  toggleLike,
  type Comment,
  type LikeStatus,
} from "../api/engagement";
import { useAuth } from "../context/AuthContext";

const DEFAULT_AVATAR = "/avatar.svg";

function formatCommentTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function displayName(user: Comment["user"]) {
  return user.nickname || user.username;
}

function countComments(comments: Comment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

function removeCommentFromTree(comments: Comment[], id: number): Comment[] {
  return comments
    .filter((comment) => comment.id !== id)
    .map((comment) => ({
      ...comment,
      replies: removeCommentFromTree(comment.replies, id),
    }));
}

function addReplyToTree(comments: Comment[], parentId: number, reply: Comment): Comment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return { ...comment, replies: [...comment.replies, reply] };
    }
    return { ...comment, replies: addReplyToTree(comment.replies, parentId, reply) };
  });
}

type CommentItemProps = {
  comment: Comment;
  user: ReturnType<typeof useAuth>["user"];
  replyTo: number | null;
  setReplyTo: (id: number | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  replySubmitting: boolean;
  onReplySubmit: (parentId: number, e: FormEvent) => void;
  onDelete: (id: number) => void;
  depth?: number;
};

function CommentItem({
  comment,
  user,
  replyTo,
  setReplyTo,
  replyText,
  setReplyText,
  replySubmitting,
  onReplySubmit,
  onDelete,
  depth = 0,
}: CommentItemProps) {
  const isReplying = replyTo === comment.id;

  return (
    <li className={`comment-item${depth > 0 ? " comment-item-reply" : ""}`}>
      <img
        className="comment-avatar"
        src={comment.user.avatar_url || DEFAULT_AVATAR}
        alt=""
        onError={(e) => {
          e.currentTarget.src = DEFAULT_AVATAR;
        }}
      />
      <div className="comment-body">
        <div className="comment-meta">
          <span className="comment-author">{displayName(comment.user)}</span>
          <span className="comment-time">{formatCommentTime(comment.created_at)}</span>
          {user && (
            <button type="button" className="comment-reply-btn" onClick={() => setReplyTo(comment.id)}>
              回复
            </button>
          )}
          {user?.id === comment.user.id && (
            <button type="button" className="comment-delete" onClick={() => onDelete(comment.id)}>
              删除
            </button>
          )}
        </div>
        <p className="comment-content">{comment.content}</p>

        {isReplying && user && (
          <form className="reply-form" onSubmit={(e) => onReplySubmit(comment.id, e)}>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`回复 ${displayName(comment.user)}…`}
              maxLength={2000}
              rows={2}
              required
              autoFocus
            />
            <div className="reply-form-actions">
              <button
                type="submit"
                className="btn-primary btn-sm"
                disabled={replySubmitting || !replyText.trim()}
              >
                {replySubmitting ? "发送中…" : "发送回复"}
              </button>
              <button
                type="button"
                className="comment-cancel-btn"
                onClick={() => {
                  setReplyTo(null);
                  setReplyText("");
                }}
              >
                取消
              </button>
            </div>
          </form>
        )}

        {comment.replies.length > 0 && (
          <ul className="comment-replies">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                user={user}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyText={replyText}
                setReplyText={setReplyText}
                replySubmitting={replySubmitting}
                onReplySubmit={onReplySubmit}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function ArticleEngagement({ articleId }: { articleId: number }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState<LikeStatus>({ count: 0, liked: false });
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchLikeStatus(articleId), fetchComments(articleId)])
      .then(([likeData, commentData]) => {
        if (!cancelled) {
          setLikes(likeData);
          setComments(commentData);
        }
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
  }, [articleId]);

  async function handleLike() {
    if (!user) return;
    setLikeLoading(true);
    setError(null);
    try {
      const data = await toggleLike(articleId);
      setLikes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const comment = await postComment(articleId, text);
      setComments((prev) => [...prev, { ...comment, replies: comment.replies ?? [] }]);
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "发表评论失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplySubmit(parentId: number, e: FormEvent) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !user) return;
    setReplySubmitting(true);
    setError(null);
    try {
      const reply = await postComment(articleId, text, parentId);
      setComments((prev) =>
        addReplyToTree(prev, parentId, { ...reply, replies: reply.replies ?? [] }),
      );
      setReplyTo(null);
      setReplyText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "回复失败");
    } finally {
      setReplySubmitting(false);
    }
  }

  async function handleDelete(commentId: number) {
    setError(null);
    try {
      await deleteComment(commentId);
      setComments((prev) => removeCommentFromTree(prev, commentId));
      if (replyTo === commentId) {
        setReplyTo(null);
        setReplyText("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  const totalComments = countComments(comments);

  if (loading) {
    return <p className="engagement-loading">加载互动数据…</p>;
  }

  return (
    <section className="article-engagement">
      <div className="engagement-actions">
        {user ? (
          <button
            type="button"
            className={`like-btn${likes.liked ? " liked" : ""}`}
            onClick={handleLike}
            disabled={likeLoading}
          >
            {likes.liked ? "❤️" : "🤍"} {likes.count} 赞
          </button>
        ) : (
          <div className="like-btn like-btn-static">
            ❤️ {likes.count} 赞
            <Link to="/login" className="engagement-login-link">
              登录后可点赞
            </Link>
          </div>
        )}
        <span className="comment-count">💬 {totalComments} 条评论</span>
      </div>

      <div className="comment-section">
        <h3 className="comment-heading">评论</h3>

        {user ? (
          <form className="comment-form" onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下你的想法…"
              maxLength={2000}
              rows={3}
              required
            />
            <button type="submit" className="btn-primary" disabled={submitting || !content.trim()}>
              {submitting ? "发送中…" : "发表评论"}
            </button>
          </form>
        ) : (
          <p className="comment-login-hint">
            <Link to="/login">登录</Link> 后参与评论
          </p>
        )}

        {error && <div className="engagement-error">{error}</div>}

        <ul className="comment-list">
          {comments.length === 0 && <li className="comment-empty">暂无评论，来抢沙发吧</li>}
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              user={user}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              replySubmitting={replySubmitting}
              onReplySubmit={handleReplySubmit}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models import Article, ArticleLike, Comment, User
from app.schemas import CommentCreate, CommentAuthor, CommentRead, LikeStatus

router = APIRouter(prefix="/articles", tags=["articles"])


def _get_article_or_404(article_id: int, db: Session) -> Article:
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
    return article


def _to_comment_read(comment: Comment, user: User) -> CommentRead:
    return CommentRead(
        id=comment.id,
        content=comment.content,
        created_at=comment.created_at,
        user=CommentAuthor.model_validate(user),
        replies=[],
    )


def _build_comment_tree(rows: list[tuple[Comment, User]]) -> list[CommentRead]:
    nodes: dict[int, CommentRead] = {}
    top_level: list[CommentRead] = []

    for comment, user in rows:
        nodes[comment.id] = _to_comment_read(comment, user)

    for comment, _user in rows:
        node = nodes[comment.id]
        if comment.parent_id is None:
            top_level.append(node)
        else:
            parent = nodes.get(comment.parent_id)
            if parent:
                parent.replies.append(node)

    return top_level


@router.get("/{article_id}/likes", response_model=LikeStatus)
def get_likes(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    _get_article_or_404(article_id, db)
    count = db.query(ArticleLike).filter(ArticleLike.article_id == article_id).count()
    liked = False
    if current_user:
        liked = (
            db.query(ArticleLike)
            .filter(
                ArticleLike.article_id == article_id,
                ArticleLike.user_id == current_user.id,
            )
            .first()
            is not None
        )
    return LikeStatus(count=count, liked=liked)


@router.post("/{article_id}/like", response_model=LikeStatus)
def toggle_like(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_article_or_404(article_id, db)
    existing = (
        db.query(ArticleLike)
        .filter(
            ArticleLike.article_id == article_id,
            ArticleLike.user_id == current_user.id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(ArticleLike(user_id=current_user.id, article_id=article_id))
    db.commit()

    count = db.query(ArticleLike).filter(ArticleLike.article_id == article_id).count()
    return LikeStatus(count=count, liked=existing is None)


@router.get("/{article_id}/comments", response_model=list[CommentRead])
def list_comments(article_id: int, db: Session = Depends(get_db)):
    _get_article_or_404(article_id, db)
    rows = (
        db.query(Comment, User)
        .join(User, Comment.user_id == User.id)
        .filter(Comment.article_id == article_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return _build_comment_tree(rows)


@router.post("/{article_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_comment(
    article_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_article_or_404(article_id, db)

    parent_id = payload.parent_id
    if parent_id is not None:
        parent = db.get(Comment, parent_id)
        if not parent or parent.article_id != article_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="回复目标不存在")
        if parent.parent_id is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只能回复顶级评论")

    comment = Comment(
        article_id=article_id,
        user_id=current_user.id,
        parent_id=parent_id,
        content=payload.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _to_comment_read(comment, current_user)

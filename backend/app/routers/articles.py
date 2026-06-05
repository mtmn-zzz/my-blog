from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.ai_summary import generate_article_summary, is_ai_configured
from app.database import get_db
from app.models import Article, ArticleLike
from app.schemas import ArticleCreate, ArticleListItem, ArticleRead

router = APIRouter(prefix="/articles", tags=["articles"])


def _articles_with_like_counts(articles: list[Article], db: Session) -> list[ArticleListItem]:
    if not articles:
        return []
    ids = [a.id for a in articles]
    like_rows = (
        db.query(ArticleLike.article_id, func.count(ArticleLike.id))
        .filter(ArticleLike.article_id.in_(ids))
        .group_by(ArticleLike.article_id)
        .all()
    )
    like_map = {article_id: count for article_id, count in like_rows}
    return [
        ArticleListItem(
            id=a.id,
            title=a.title,
            summary=a.summary,
            content=a.content,
            read_time=a.read_time,
            created_at=a.created_at,
            updated_at=a.updated_at,
            like_count=like_map.get(a.id, 0),
        )
        for a in articles
    ]


@router.get("", response_model=list[ArticleListItem])
def list_articles(
    q: str | None = Query(None, min_length=1, max_length=100, description="搜索关键词"),
    db: Session = Depends(get_db),
):
    query = db.query(Article)
    if q:
        keyword = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Article.title.ilike(keyword),
                Article.summary.ilike(keyword),
                Article.content.ilike(keyword),
            )
        )
    articles = query.order_by(Article.created_at.desc()).all()
    return _articles_with_like_counts(articles, db)


@router.get("/{article_id}", response_model=ArticleRead)
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
    return article


@router.post("", response_model=ArticleRead, status_code=status.HTTP_201_CREATED)
async def create_article(payload: ArticleCreate, db: Session = Depends(get_db)):
    summary = payload.summary.strip()
    article = Article(
        title=payload.title,
        summary=summary,
        content=payload.content,
    )
    db.add(article)
    db.commit()
    db.refresh(article)

    if not summary and is_ai_configured() and article.content.strip():
        try:
            article.summary = await generate_article_summary(article.title, article.content)
            db.commit()
            db.refresh(article)
        except HTTPException:
            pass

    return article


@router.post("/{article_id}/summarize", response_model=ArticleRead)
async def summarize_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
    if not article.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="文章内容为空，无法生成摘要")

    article.summary = await generate_article_summary(article.title, article.content)
    db.commit()
    db.refresh(article)
    return article


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(article_id: int, db: Session = Depends(get_db)):

    article = db.get(Article, article_id)


    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文章不存在"
        )

    db.delete(article)
    db.commit()

    return None
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArticleBase(BaseModel):
    title: str = Field(..., max_length=500)
    summary: str = Field(default="", max_length=2000)
    content: str = ""


class ArticleCreate(ArticleBase):
    pass


class ArticleUpdate(BaseModel):
    title: str | None = Field(None, max_length=500)
    summary: str | None = Field(None, max_length=2000)
    content: str | None = None


class ArticleRead(ArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class LikeStatus(BaseModel):
    count: int
    liked: bool


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: int | None = None


class CommentAuthor(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    nickname: str | None
    avatar_url: str | None


class CommentRead(BaseModel):
    id: int
    content: str
    created_at: datetime
    user: CommentAuthor
    replies: list["CommentRead"] = []


CommentRead.model_rebuild()


class ArticleListItem(BaseModel):
    id: int
    title: str
    summary: str
    content: str
    read_time: int
    created_at: datetime
    updated_at: datetime
    like_count: int = 0

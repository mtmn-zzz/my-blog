from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArticleBase(BaseModel):
    title: str = Field(..., max_length=500)
    summary: str = Field(default="", max_length=2000)
    content: str = ""


class ArticleCreate(ArticleBase):
    pass


class ArticleRead(ArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime 

class ArticleListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: str
    content: str
    read_time: int
    created_at: datetime
    updated_at: datetime

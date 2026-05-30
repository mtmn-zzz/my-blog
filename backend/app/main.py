from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.models import Article  # noqa: F401 — register model with metadata
from app.routers import articles


def _ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)
    # create_all 不会给已有表加列；旧库需手动补齐
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE articles "
                "ADD COLUMN IF NOT EXISTS read_time INTEGER NOT NULL DEFAULT 1"
            )
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    _ensure_schema()
    yield


app = FastAPI(title="Personal Blog API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(articles.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Blog API", "docs": "/docs"}

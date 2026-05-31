import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.models import Article  # noqa: F401 — register model with metadata
from app.routers import articles

# 设置日志，方便看清到底是哪里卡或报错
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")


def _ensure_schema() -> None:
    """安全的数据库表结构初始化与升级逻辑"""
    try:
        logger.info("正在检查并初始化数据库表结构...")
        # 1. 创建缺失的表
        Base.metadata.create_all(bind=engine)

        # 2. 尝试安全地给已有表添加新列（加锁超时，避免被未提交事务永久阻塞）
        with engine.connect() as conn:
            with conn.begin():
                conn.execute(text("SET lock_timeout = '5s'"))
                conn.execute(
                    text(
                        "ALTER TABLE articles "
                        "ADD COLUMN IF NOT EXISTS read_time INTEGER NOT NULL DEFAULT 1"
                    )
                )
        logger.info("数据库表结构检查/升级完成。")
    except Exception as e:
        # 🔥 关键保护：即便数据库连接超时或死锁，也只打印错误而不卡死整个后端服务
        logger.error(f"数据库初始化失败（可能由于锁冲突或连接超时），已跳过。错误信息: {e}")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # 启动时执行数据库安全检查
    _ensure_schema()
    yield


app: FastAPI = FastAPI(title="Personal Blog API", lifespan=lifespan)

# 跨域配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册文章路由（确保你修改的 articles.py 是在该文件导入的 app.routers 路径下）
app.include_router(articles.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Blog API", "docs": "/docs"}
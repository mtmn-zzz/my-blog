"""
插入示例文章（可重复执行：仅在 articles 表为空时写入）。
用法：docker compose exec backend python seed.py
或本地：cd backend && set DATABASE_URL=... && python seed.py
"""

from app.database import SessionLocal
from app.models import Article

SEED_ARTICLES = [
    {
        "title": "从0到1搭建个人博客：技术选型与架构设计",
        "summary": "分享全栈博客的技术选型心得：敬请期待中……",
        "content": """## 为什么做个人博客————因为这是内训项目hhh

在技术成长路上，把学习笔记与思考沉淀成可公开的内容，既方便回顾，也能帮到同行。

这是我自己写的第一篇文章内容！感谢大家的阅读！"""
    }
]


def main():
    db = SessionLocal()
    try:
        count = db.query(Article).count()
        if count > 0:
            print(f"已有 {count} 篇文章，跳过 seed。")
            return
        for row in SEED_ARTICLES:
            db.add(Article(title=row["title"], summary=row["summary"], content=row["content"]))
        db.commit()
        print(f"已插入 {len(SEED_ARTICLES)} 篇示例文章。")
    finally:
        db.close()


if __name__ == "__main__":
    main()

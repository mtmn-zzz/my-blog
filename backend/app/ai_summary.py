import os
import re

import httpx
from fastapi import HTTPException, status

AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_API_BASE = os.getenv(
    "AI_API_BASE",
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
)
AI_MODEL = os.getenv("AI_MODEL", "qwen-turbo")
MAX_CONTENT_CHARS = 6000


def is_ai_configured() -> bool:
    return bool(AI_API_KEY.strip())


def _strip_markdown(text: str) -> str:
    cleaned = re.sub(r"```[\s\S]*?```", " ", text)
    cleaned = re.sub(r"`[^`]+`", " ", cleaned)
    cleaned = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)
    cleaned = re.sub(r"#{1,6}\s*", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


async def generate_article_summary(title: str, content: str) -> str:
    if not is_ai_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI 摘要服务未配置，请设置 AI_API_KEY",
        )

    body = _strip_markdown(content)[:MAX_CONTENT_CHARS]
    prompt = (
        "你是一位博客编辑。请根据以下文章标题和正文，用中文写一段简洁摘要。\n"
        "要求：2-3 句话，不超过 150 字，直接输出摘要正文，不要标题、引号或多余说明。\n\n"
        f"标题：{title}\n\n"
        f"正文：\n{body}"
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{AI_API_BASE.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {AI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": AI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 300,
                "temperature": 0.3,
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI 服务请求失败，请稍后重试",
        )

    data = response.json()
    try:
        summary = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI 返回格式异常",
        ) from exc

    summary = summary.strip().strip("\"'""''「」")
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI 未返回有效摘要",
        )
    return summary[:2000]

import logging
import os
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import quote, urlencode

import httpx
import jwt
from fastapi import HTTPException, status

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_CALLBACK_URL = os.getenv(
    "GITHUB_CALLBACK_URL",
    "http://127.0.0.1:8000/auth/github/callback",
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

# GitHub OAuth 常见错误 → 中文说明
_GITHUB_ERROR_HINTS: dict[str, str] = {
    "bad_verification_code": "授权码无效或已使用，请从登录页重新点击 GitHub 登录（不要刷新回调页）",
    "incorrect_client_credentials": "Client ID 或 Client Secret 不正确，请核对 .env 与 GitHub OAuth App",
    "redirect_uri_mismatch": "Callback URL 不一致，GitHub App、.env、授权请求三处必须完全相同",
    "application_suspended": "GitHub OAuth App 已被暂停",
}

logger = logging.getLogger(__name__)


def _format_github_token_error(token_data: dict) -> str:
    github_error = str(token_data.get("error") or "")
    github_desc = str(token_data.get("error_description") or "")
    hint = _GITHUB_ERROR_HINTS.get(github_error, "")
    detail = "未获取到 GitHub 访问令牌"
    if github_desc:
        detail = f"{detail}：{github_desc}"
    elif github_error:
        detail = f"{detail}：{github_error}"
    if hint:
        detail = f"{detail}（{hint}）"
    return detail


def is_github_oauth_configured() -> bool:
    return bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)


def create_oauth_state() -> str:
    expire = datetime.now(UTC) + timedelta(minutes=10)
    payload = {"purpose": "github_oauth", "nonce": secrets.token_urlsafe(16), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_oauth_state(state: str) -> None:
    try:
        payload = jwt.decode(state, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("purpose") != "github_oauth":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 OAuth 状态")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth 状态已过期或无效") from exc


def build_github_authorize_url(state: str) -> str:
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_CALLBACK_URL,
        "scope": "read:user user:email",
        "state": state,
    }
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


def build_frontend_callback_url(token: str) -> str:
    # JWT 必须 URL 编码，否则 + / = 等字符会在浏览器解析 query 时被破坏
    return f"{FRONTEND_URL.rstrip('/')}/auth/github/callback?token={quote(token, safe='')}"


def build_frontend_error_url(message: str) -> str:
    return f"{FRONTEND_URL.rstrip('/')}/auth/github/callback?error={quote(message)}"


async def exchange_github_code(code: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            token_res = await client.post(
                GITHUB_TOKEN_URL,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "my-blog-oauth",
                },
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GITHUB_CALLBACK_URL,
                },
            )
    except httpx.RequestError as exc:
        logger.error("GitHub token 请求网络失败: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="服务器无法连接 GitHub，请检查网络或稍后重试",
        ) from exc

    if token_res.status_code != 200:
        logger.error("GitHub token HTTP %s: %s", token_res.status_code, token_res.text[:500])
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub 授权失败")

    token_data = token_res.json()
    access_token = token_data.get("access_token")
    if not access_token:
        logger.error(
            "GitHub token 交换失败 callback=%s client_id=%s... response=%s",
            GITHUB_CALLBACK_URL,
            (GITHUB_CLIENT_ID[:8] + "...") if GITHUB_CLIENT_ID else "(empty)",
            token_data,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_format_github_token_error(token_data),
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            }
            user_res = await client.get(GITHUB_USER_URL, headers=headers)
            if user_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="获取 GitHub 用户信息失败",
                )
            profile = user_res.json()

            email = profile.get("email")
            if not email:
                emails_res = await client.get(GITHUB_EMAILS_URL, headers=headers)
                if emails_res.status_code == 200:
                    emails = emails_res.json()
                    primary = next((item for item in emails if item.get("primary")), None)
                    verified = next((item for item in emails if item.get("verified")), None)
                    picked = primary or verified or (emails[0] if emails else None)
                    if picked:
                        email = picked.get("email")
    except httpx.RequestError as exc:
        logger.error("GitHub user API 网络失败: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="服务器无法连接 GitHub API",
        ) from exc

    return {
        "github_id": profile["id"],
        "login": profile.get("login") or f"github_{profile['id']}",
        "name": profile.get("name"),
        "avatar_url": profile.get("avatar_url"),
        "email": email,
    }

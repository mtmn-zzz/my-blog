import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.github_oauth import (
    GITHUB_CALLBACK_URL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    FRONTEND_URL,
    build_frontend_callback_url,
    build_frontend_error_url,
    build_github_authorize_url,
    create_oauth_state,
    exchange_github_code,
    is_github_oauth_configured,
    verify_oauth_state,
)
from app.models import User
from app.security import create_access_token

router = APIRouter(prefix="/auth", tags=["认证"])


def _unique_username(db: Session, base: str) -> str:
    candidate = base[:50]
    if not db.query(User).filter(User.username == candidate).first():
        return candidate
    for _ in range(20):
        suffix = secrets.token_hex(3)
        trimmed = base[: max(1, 50 - len(suffix) - 1)]
        candidate = f"{trimmed}_{suffix}"
        if not db.query(User).filter(User.username == candidate).first():
            return candidate
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="无法生成用户名")


def _find_or_create_github_user(db: Session, profile: dict) -> User:
    github_id = profile["github_id"]
    user = db.query(User).filter(User.github_id == github_id).first()
    if user:
        if profile.get("avatar_url") and not user.avatar_url:
            user.avatar_url = profile["avatar_url"]
        if profile.get("name") and not user.nickname:
            user.nickname = profile["name"]
        if profile.get("email") and not user.email:
            existing_email = db.query(User).filter(User.email == profile["email"], User.id != user.id).first()
            if not existing_email:
                user.email = profile["email"]
        db.commit()
        db.refresh(user)
        return user

    email = profile.get("email")
    if email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.github_id = github_id
            if profile.get("avatar_url") and not user.avatar_url:
                user.avatar_url = profile["avatar_url"]
            if profile.get("name") and not user.nickname:
                user.nickname = profile["name"]
            db.commit()
            db.refresh(user)
            return user

    username = _unique_username(db, profile["login"])
    user = User(
        username=username,
        github_id=github_id,
        email=email,
        nickname=profile.get("name"),
        avatar_url=profile.get("avatar_url"),
        password_hash=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/github/config")
def github_config():
    """检查 GitHub OAuth 配置（不暴露 Secret）"""
    return {
        "configured": is_github_oauth_configured(),
        "client_id": GITHUB_CLIENT_ID[:8] + "..." if GITHUB_CLIENT_ID else None,
        "has_secret": bool(GITHUB_CLIENT_SECRET),
        "callback_url": GITHUB_CALLBACK_URL,
        "frontend_url": FRONTEND_URL,
    }


@router.get("/github")
def github_login():
    if not is_github_oauth_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub 登录未配置")
    state = create_oauth_state()
    return RedirectResponse(build_github_authorize_url(state), status_code=status.HTTP_302_FOUND)


@router.get("/github/callback")
async def github_callback(code: str | None = None, state: str | None = None, db: Session = Depends(get_db)):
    if not is_github_oauth_configured():
        return RedirectResponse(build_frontend_error_url("GitHub登录未配置"))
    if not code or not state:
        return RedirectResponse(build_frontend_error_url("授权参数缺失"))
    try:
        verify_oauth_state(state)
        profile = await exchange_github_code(code)
        user = _find_or_create_github_user(db, profile)
        token = create_access_token(user.id)
        return RedirectResponse(build_frontend_callback_url(token), status_code=status.HTTP_302_FOUND)
    except HTTPException as exc:
        return RedirectResponse(build_frontend_error_url(str(exc.detail)))
    except Exception:
        return RedirectResponse(build_frontend_error_url("GitHub登录失败"))

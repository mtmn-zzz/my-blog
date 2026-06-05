from datetime import datetime

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.security import create_access_token, hash_password, verify_password
from app.uploads import (
    ALLOWED_AVATAR_TYPES,
    AVATAR_DIR,
    EXT_BY_TYPE,
    MAX_AVATAR_BYTES,
    delete_avatar_file,
    ensure_upload_dirs,
)

router = APIRouter(prefix="/auth", tags=["认证"])


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    email: EmailStr | None = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None
    nickname: str | None
    avatar_url: str | None
    created_at: datetime
    has_password: bool = True


def serialize_user(user: User) -> UserRead:
    return UserRead.model_validate(user).model_copy(
        update={"has_password": user.password_hash is not None}
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class RegisterResponse(BaseModel):
    message: str
    user: UserRead


class UserUpdate(BaseModel):
    nickname: str | None = Field(None, max_length=50)
    email: EmailStr | None = None
    avatar_url: str | None = Field(None, max_length=255)


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class MessageResponse(BaseModel):
    message: str


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户名已被占用")

    if user_data.email and db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="邮箱已被注册")

    new_user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        email=user_data.email,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return RegisterResponse(message="注册成功", user=serialize_user(new_user))


@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if user is None or not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=serialize_user(user))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"]:
        existing = (
            db.query(User)
            .filter(User.email == data["email"], User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="邮箱已被注册")
    for key, value in data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return serialize_user(current_user)


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_upload_dirs()

    content_type = file.content_type or ""
    if content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 JPEG、PNG、WebP、GIF 格式的图片",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="文件为空")
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="图片不能超过 2MB")

    ext = EXT_BY_TYPE[content_type]
    filename = f"{current_user.id}_{uuid.uuid4().hex}{ext}"
    dest = AVATAR_DIR / filename
    old_avatar_url = current_user.avatar_url

    dest.write_bytes(content)

    current_user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)

    delete_avatar_file(old_avatar_url)
    return serialize_user(current_user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.password_hash:
        if not verify_password(payload.old_password, current_user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="原密码错误")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return MessageResponse(message="密码已更新")

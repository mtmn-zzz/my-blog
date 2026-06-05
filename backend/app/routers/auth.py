from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["认证中心"])

# 初始化密码加密工具
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 规定注册时前端传过来的数据格式
class UserRegister(BaseModel):
    username: str
    password: str
    email: EmailStr = None

@router.post("/register", summary="用户注册")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # 1. 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="用户名已被占用"
        )
    
    # 2. 对密码进行哈希加密
    hashed_password = pwd_context.hash(user_data.password)
    
    # 3. 创建新用户对象
    new_user = User(
        username=user_data.username,
        password_hash=hashed_password,
        email=user_data.email
    )
    
    # 4. 保存到数据库
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "注册成功", "user_id": new_user.id}

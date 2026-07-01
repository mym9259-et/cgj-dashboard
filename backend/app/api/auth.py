from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.auth_user import AuthUser
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    UserInfo,
)
from app.services.auth_service import (
    SESSION_COOKIE,
    create_session_token,
    get_current_user,
    hash_password,
    require_admin,
    validate_new_password,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.session_hours * 3600,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/",
    )


@router.post("/login", response_model=UserInfo)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(AuthUser).where(AuthUser.username == body.username))
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    _set_session_cookie(response, create_session_token(user))
    return UserInfo(username=user.username, role=user.role)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserInfo)
async def me(user: AuthUser = Depends(get_current_user)):
    return UserInfo(username=user.username, role=user.role)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    response: Response,
    user: AuthUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="当前密码不正确")
    validate_new_password(body.new_password)
    user.password_hash = hash_password(body.new_password)
    user.session_version += 1
    await db.commit()
    _set_session_cookie(response, create_session_token(user))
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    _: AuthUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if body.username != settings.standard_username:
        raise HTTPException(status_code=400, detail="只能重置普通用户密码")
    validate_new_password(body.new_password)
    user = await db.scalar(select(AuthUser).where(AuthUser.username == body.username))
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.password_hash = hash_password(body.new_password)
    user.session_version += 1
    await db.commit()
    return {"ok": True}

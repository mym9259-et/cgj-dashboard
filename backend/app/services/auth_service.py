"""Password hashing, signed sessions, and bootstrap users."""

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.auth_user import AuthUser


logger = logging.getLogger("auth")
SESSION_COOKIE = "cgj_session"
_session_secret = settings.app_secret_key or secrets.token_urlsafe(48)

if not settings.app_secret_key:
    logger.warning("APP_SECRET_KEY is not configured; sessions will reset on restart")


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=64
    )
    return f"scrypt$16384$8$1${_b64encode(salt)}${_b64encode(digest)}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$", 5)
        if algorithm != "scrypt":
            return False
        digest = hashlib.scrypt(
            password.encode("utf-8"),
            salt=_b64decode(salt),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=64,
        )
        return hmac.compare_digest(_b64encode(digest), expected)
    except (ValueError, TypeError):
        return False


def validate_new_password(password: str) -> None:
    if len(password) < 12:
        raise HTTPException(status_code=400, detail="密码长度不能少于12位")
    if password.isalpha() or password.isdigit():
        raise HTTPException(status_code=400, detail="密码需同时包含字母和数字或符号")


def create_session_token(user: AuthUser) -> str:
    payload = {
        "sub": user.id,
        "ver": user.session_version,
        "exp": int(time.time()) + settings.session_hours * 3600,
    }
    body = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        _session_secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256
    ).digest()
    return f"{body}.{_b64encode(signature)}"


def decode_session_token(token: str) -> dict | None:
    try:
        body, signature = token.split(".", 1)
        expected = hmac.new(
            _session_secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_b64encode(expected), signature):
            return None
        payload = json.loads(_b64decode(body))
        if int(payload["exp"]) < int(time.time()):
            return None
        return payload
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthUser:
    token = request.cookies.get(SESSION_COOKIE, "")
    payload = decode_session_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")

    user = await db.get(AuthUser, int(payload["sub"]))
    if (
        user is None
        or not user.is_active
        or user.session_version != int(payload["ver"])
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效")
    return user


async def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅超级管理员可执行此操作")
    return user


async def ensure_default_users(db: AsyncSession) -> None:
    users = (
        (settings.admin_username, "admin", settings.admin_initial_password),
        (settings.standard_username, "user", settings.standard_initial_password),
    )
    for username, role, configured_password in users:
        existing = await db.scalar(select(AuthUser).where(AuthUser.username == username))
        if existing:
            continue
        password = configured_password or secrets.token_urlsafe(18)
        db.add(
            AuthUser(
                username=username,
                role=role,
                password_hash=hash_password(password),
            )
        )
        if not configured_password:
            logger.warning("Generated initial password for %s: %s", username, password)
    await db.commit()

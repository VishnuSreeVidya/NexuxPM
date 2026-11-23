from collections.abc import Callable
from typing import get_args

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import User
from schemas import LoginRequest, LoginResponse, RoleSwitchRequest, UserProfile, UserRole
from security import (
    create_access_token,
    decode_access_token_claims,
    get_auth_settings,
    verify_password,
    verify_unknown_user_password,
)


router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)
VALID_ROLES = frozenset(get_args(UserRole))
INVALID_CREDENTIALS = "Invalid email or password."
INVALID_TOKEN = "Invalid or expired access token."


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _user_profile(user: User, active_role: str) -> UserProfile:
    return UserProfile(
        id=user.id,
        name=user.name,
        email=user.email,
        role=active_role,
        roles=sorted(user.assigned_roles),
        activeRole=active_role,
        department=user.department,
        title=user.title,
        avatar_color=user.avatar_color,
        profileImageAvailable=user.profile_image_key is not None,
        phone=user.phone,
        location=user.location,
        bio=user.bio,
        joined_at=user.joined_at,
        last_login_at=user.last_login_at,
    )


def _login_response(user: User, active_role: str) -> LoginResponse:
    settings = get_auth_settings()
    return LoginResponse(
        access_token=create_access_token(user.id, active_role),
        expires_in=settings.jwt_access_token_expire_minutes * 60,
        user=_user_profile(user, active_role),
    )


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(
        select(User)
        .options(selectinload(User.role_assignments))
        .where(func.lower(User.email) == request.email)
    )
    if user is None:
        verify_unknown_user_password(request.password)
        raise _unauthorized(INVALID_CREDENTIALS)
    if not verify_password(request.password, user.password_hash):
        raise _unauthorized(INVALID_CREDENTIALS)

    assigned_roles = user.assigned_roles
    if not assigned_roles:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Role assignments are not initialized. Run the user-role migration.",
        )
    active_role = user.role if user.role in assigned_roles else sorted(assigned_roles)[0]
    return _login_response(user, active_role)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized(INVALID_TOKEN)

    try:
        user_id, token_role = decode_access_token_claims(credentials.credentials)
    except jwt.InvalidTokenError:
        raise _unauthorized(INVALID_TOKEN) from None

    user = db.scalar(
        select(User)
        .options(selectinload(User.role_assignments))
        .where(User.id == user_id)
    )
    if user is None:
        raise _unauthorized(INVALID_TOKEN)
    assigned_roles = user.assigned_roles
    if not assigned_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No roles are assigned to this user.",
        )
    active_role = token_role or user.role
    if active_role not in VALID_ROLES or active_role not in assigned_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The active role is not assigned to this user.",
        )
    user.active_role = active_role
    return user


@router.post("/switch-role", response_model=LoginResponse)
def switch_role(
    request: RoleSwitchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LoginResponse:
    if request.role not in current_user.assigned_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The requested role is not assigned to this user.",
        )
    return _login_response(current_user, request.role)


def require_roles(*roles: str) -> Callable[..., User]:
    if not roles or any(role not in VALID_ROLES for role in roles):
        raise ValueError("At least one valid application role is required.")
    allowed_roles = frozenset(roles)

    def role_guard(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.active_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return current_user

    return role_guard


@router.get("/me", response_model=UserProfile)
def read_current_user(
    current_user: User = Depends(get_current_user),
) -> UserProfile:
    return _user_profile(current_user, current_user.active_role)

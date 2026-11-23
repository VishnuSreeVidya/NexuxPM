import base64
import binascii
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

import jwt
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PBKDF2_ITERATIONS = 600_000
JWT_ALGORITHM = "HS256"
JWT_ISSUER = "project-management-tool"
_DUMMY_PASSWORD_HASH = (
    "pbkdf2_sha256$600000$AAAAAAAAAAAAAAAAAAAAAA=="
    "$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
)


class AuthSettings(BaseSettings):
    jwt_secret: SecretStr
    jwt_access_token_expire_minutes: int = Field(default=30, gt=0, le=1440)

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / ".env",
        extra="ignore",
    )

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value().encode("utf-8")) < 32:
            raise ValueError("JWT_SECRET must be at least 32 bytes long.")
        return value


@lru_cache
def get_auth_settings() -> AuthSettings:
    return AuthSettings()


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = stored_hash.split("$")
        iterations = int(iterations_text)
        if algorithm != "pbkdf2_sha256" or not 100_000 <= iterations <= 1_000_000:
            return False

        salt = base64.b64decode(salt_text, altchars=b"-_", validate=True)
        expected_digest = base64.b64decode(
            digest_text,
            altchars=b"-_",
            validate=True,
        )
        if len(salt) != 16 or len(expected_digest) != hashlib.sha256().digest_size:
            return False

        actual_digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )
    except (ValueError, TypeError, binascii.Error, UnicodeEncodeError):
        return False

    return hmac.compare_digest(actual_digest, expected_digest)


def verify_unknown_user_password(password: str) -> None:
    verify_password(password, _DUMMY_PASSWORD_HASH)


def create_access_token(subject: str, active_role: str) -> str:
    settings = get_auth_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    return jwt.encode(
        {
            "sub": subject,
            "role": active_role,
            "iat": now,
            "exp": expires_at,
            "iss": JWT_ISSUER,
        },
        settings.jwt_secret.get_secret_value(),
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> str:
    subject, _ = decode_access_token_claims(token)
    return subject


def decode_access_token_claims(token: str) -> tuple[str, str | None]:
    settings = get_auth_settings()
    payload = jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=[JWT_ALGORITHM],
        issuer=JWT_ISSUER,
        options={"require": ["exp", "iat", "sub", "iss"]},
    )
    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise jwt.InvalidTokenError("Token subject is invalid.")
    active_role = payload.get("role")
    if active_role is not None and (
        not isinstance(active_role, str) or not active_role
    ):
        raise jwt.InvalidTokenError("Token role is invalid.")
    return subject, active_role

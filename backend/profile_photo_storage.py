import logging
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import NamedTuple

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


logger = logging.getLogger(__name__)
PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024
PROFILE_PHOTO_CONTENT_TYPES = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)


class ProfilePhotoSettings(BaseSettings):
    endpoint_url: str = Field(validation_alias="S3_ENDPOINT_URL")
    bucket: str = Field(validation_alias="S3_BUCKET")
    access_key_id: SecretStr = Field(validation_alias="S3_ACCESS_KEY_ID")
    secret_access_key: SecretStr = Field(validation_alias="S3_SECRET_ACCESS_KEY")
    region: str = Field(default="us-east-1", validation_alias="S3_REGION")

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().with_name(".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


class ProfilePhotoStorageError(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class ProfilePhotoObjectNotFound(ProfilePhotoStorageError):
    pass


class StoredProfilePhoto(NamedTuple):
    content: bytes
    content_type: str


@lru_cache
def get_profile_photo_settings() -> ProfilePhotoSettings:
    return ProfilePhotoSettings()


@lru_cache
def get_s3_client():
    settings = get_profile_photo_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.endpoint_url,
        aws_access_key_id=settings.access_key_id.get_secret_value(),
        aws_secret_access_key=settings.secret_access_key.get_secret_value(),
        region_name=settings.region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        ),
    )


def _bucket() -> str:
    return get_profile_photo_settings().bucket


def _error_code(error: ClientError | BotoCoreError) -> str:
    if isinstance(error, ClientError):
        return str(error.response.get("Error", {}).get("Code", "ClientError"))
    return type(error).__name__


def upload_profile_photo_object(
    key: str,
    content: bytes,
    content_type: str,
) -> None:
    try:
        get_s3_client().put_object(
            Bucket=_bucket(),
            Key=key,
            Body=BytesIO(content),
            ContentLength=len(content),
            ContentType=content_type,
            CacheControl="private, no-store",
        )
    except (BotoCoreError, ClientError) as error:
        code = _error_code(error)
        logger.error("Profile photo upload failed (S3 error code: %s).", code)
        raise ProfilePhotoStorageError(code) from None


def read_profile_photo_object(key: str) -> StoredProfilePhoto:
    try:
        response = get_s3_client().get_object(Bucket=_bucket(), Key=key)
    except (BotoCoreError, ClientError) as error:
        code = _error_code(error)
        if code in {"NoSuchKey", "NotFound", "404"}:
            raise ProfilePhotoObjectNotFound(code) from None
        logger.error("Profile photo retrieval failed (S3 error code: %s).", code)
        raise ProfilePhotoStorageError(code) from None

    body = response["Body"]
    try:
        content = body.read(PROFILE_PHOTO_MAX_BYTES + 1)
    except (BotoCoreError, ClientError) as error:
        code = _error_code(error)
        logger.error("Profile photo read failed (S3 error code: %s).", code)
        raise ProfilePhotoStorageError(code) from None
    finally:
        body.close()

    if len(content) > PROFILE_PHOTO_MAX_BYTES:
        raise ProfilePhotoStorageError("ObjectTooLarge")
    return StoredProfilePhoto(content, response.get("ContentType", ""))


def delete_profile_photo_object(key: str) -> None:
    try:
        get_s3_client().delete_object(Bucket=_bucket(), Key=key)
    except (BotoCoreError, ClientError) as error:
        code = _error_code(error)
        logger.error("Profile photo removal failed (S3 error code: %s).", code)
        raise ProfilePhotoStorageError(code) from None

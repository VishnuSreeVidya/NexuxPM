import logging
import warnings
from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User
from profile_photo_storage import (
    PROFILE_PHOTO_CONTENT_TYPES,
    PROFILE_PHOTO_MAX_BYTES,
    ProfilePhotoObjectNotFound,
    ProfilePhotoStorageError,
    delete_profile_photo_object,
    read_profile_photo_object,
    upload_profile_photo_object,
)
from schemas import ProfilePhotoMutationResponse


logger = logging.getLogger(__name__)
auth_router = APIRouter()
user_router = APIRouter()

MAX_IMAGE_PIXELS = 20_000_000
MAX_IMAGE_DIMENSION = 8192
MAX_STORED_DIMENSION = 2048
FORMAT_DETAILS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}


class InvalidProfilePhoto(ValueError):
    pass


def _normalize_profile_photo(content: bytes) -> tuple[bytes, str, str]:
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="The uploaded file is empty.",
        )
    if len(content) > PROFILE_PHOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Profile photos must be 5 MB or smaller.",
        )

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                image_format = image.format
                if image_format not in FORMAT_DETAILS:
                    raise InvalidProfilePhoto(
                        "Only JPEG, PNG, and WebP images are allowed."
                    )
                if getattr(image, "n_frames", 1) != 1:
                    raise InvalidProfilePhoto(
                        "Animated images are not supported."
                    )
                width, height = image.size
                if (
                    width > MAX_IMAGE_DIMENSION
                    or height > MAX_IMAGE_DIMENSION
                    or width * height > MAX_IMAGE_PIXELS
                ):
                    raise InvalidProfilePhoto(
                        "Image dimensions exceed the supported limit."
                    )
                image.verify()

            with Image.open(BytesIO(content)) as image:
                image.load()
                has_alpha = (
                    "A" in image.getbands() or "transparency" in image.info
                )
                normalized = image.convert("RGBA" if has_alpha else "RGB")
                normalized.thumbnail(
                    (MAX_STORED_DIMENSION, MAX_STORED_DIMENSION),
                    Image.Resampling.LANCZOS,
                )
                normalized.info.clear()
                output = BytesIO()
                if image_format == "JPEG":
                    normalized.save(output, format="JPEG", quality=88, optimize=True)
                elif image_format == "PNG":
                    normalized.save(output, format="PNG", optimize=True)
                else:
                    normalized.save(output, format="WEBP", quality=85, method=5)
    except InvalidProfilePhoto:
        raise
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        UnidentifiedImageError,
        ValueError,
    ) as error:
        raise InvalidProfilePhoto(
            "The file is not a valid supported image."
        ) from error

    normalized_content = output.getvalue()
    if len(normalized_content) > PROFILE_PHOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="The processed profile photo exceeds 5 MB.",
        )
    content_type, extension = FORMAT_DETAILS[image_format]
    return normalized_content, content_type, extension


def _read_uploaded_file(file: UploadFile) -> bytes:
    content = file.file.read(PROFILE_PHOTO_MAX_BYTES + 1)
    if len(content) > PROFILE_PHOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Profile photos must be 5 MB or smaller.",
        )
    return content


def _save_profile_photo(
    file: UploadFile,
    db: Session,
    current_user: User,
    *,
    replace: bool,
) -> ProfilePhotoMutationResponse:
    previous_key = current_user.profile_image_key
    if previous_key is not None and not replace:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A profile photo already exists; use the update operation.",
        )
    if previous_key is None and replace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile photo exists to update.",
        )

    try:
        content, content_type, extension = _normalize_profile_photo(
            _read_uploaded_file(file)
        )
    except InvalidProfilePhoto as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error

    new_key = f"profile-photos/{uuid4().hex}.{extension}"
    try:
        upload_profile_photo_object(new_key, content, content_type)
    except ProfilePhotoStorageError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile photo storage is unavailable.",
        ) from None

    current_user.profile_image_key = new_key
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        try:
            delete_profile_photo_object(new_key)
        except ProfilePhotoStorageError:
            logger.error("Could not clean up an unreferenced uploaded photo.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The profile photo could not be saved.",
        ) from error

    cleanup_warning = False
    if previous_key is not None:
        try:
            delete_profile_photo_object(previous_key)
        except ProfilePhotoStorageError:
            cleanup_warning = True

    return ProfilePhotoMutationResponse(
        profileImageAvailable=True,
        cleanupWarning=cleanup_warning,
    )


@auth_router.post(
    "/me/profile-photo",
    response_model=ProfilePhotoMutationResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfilePhotoMutationResponse:
    return _save_profile_photo(file, db, current_user, replace=False)


@auth_router.put(
    "/me/profile-photo",
    response_model=ProfilePhotoMutationResponse,
)
def update_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfilePhotoMutationResponse:
    return _save_profile_photo(file, db, current_user, replace=True)


@auth_router.delete(
    "/me/profile-photo",
    response_model=ProfilePhotoMutationResponse,
)
def remove_profile_photo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfilePhotoMutationResponse:
    previous_key = current_user.profile_image_key
    if previous_key is None:
        return ProfilePhotoMutationResponse(profileImageAvailable=False)

    current_user.profile_image_key = None
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The profile photo could not be removed.",
        ) from error

    cleanup_warning = False
    try:
        delete_profile_photo_object(previous_key)
    except ProfilePhotoStorageError:
        cleanup_warning = True

    return ProfilePhotoMutationResponse(
        profileImageAvailable=False,
        cleanupWarning=cleanup_warning,
    )


@user_router.get("/users/{user_id}/profile-photo")
def retrieve_profile_photo(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    user = db.get(User, user_id)
    if user is None or user.profile_image_key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile photo not found.",
        )

    try:
        photo = read_profile_photo_object(user.profile_image_key)
    except ProfilePhotoObjectNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile photo not found.",
        ) from None
    except ProfilePhotoStorageError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile photo storage is unavailable.",
        ) from None

    if photo.content_type not in PROFILE_PHOTO_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Profile photo storage returned an unsupported image type.",
        )
    return Response(
        content=photo.content,
        media_type=photo.content_type,
        headers={
            "Cache-Control": "private, no-store",
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
        },
    )

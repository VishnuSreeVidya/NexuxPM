import unittest
from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import get_current_user
from database import Base, get_db
from main import app
from migrate_profile_image_key import migrate_profile_image_key
from models import User, UserRoleAssignment
from profile_photo_storage import StoredProfilePhoto
from security import create_access_token


USER_ROLES = {
    "admin": "SUPER_ADMIN",
    "lead": "PROJECT_LEAD",
    "team-leader": "TEAM_LEADER",
    "developer": "DEVELOPER",
    "qa": "QA_ENGINEER",
}


class ProfilePhotoApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
        self._create_users()
        app.dependency_overrides[get_db] = self._get_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def _get_db(self):
        with self.session_factory() as session:
            yield session

    def _create_users(self) -> None:
        with self.session_factory() as session:
            for user_id, role in USER_ROLES.items():
                session.add(
                    User(
                        id=user_id,
                        name=user_id,
                        email=f"{user_id}@example.test",
                        password_hash="unused",
                        role=role,
                    )
                )
                session.add(UserRoleAssignment(user_id=user_id, role=role))
            session.commit()

    def _headers(self, user_id: str) -> dict[str, str]:
        return {
            "Authorization": (
                f"Bearer {create_access_token(user_id, USER_ROLES[user_id])}"
            )
        }

    @staticmethod
    def _image_bytes(image_format: str = "PNG") -> bytes:
        buffer = BytesIO()
        Image.new("RGB", (24, 16), color=(60, 120, 180)).save(
            buffer,
            format=image_format,
        )
        return buffer.getvalue()

    def _set_photo_key(self, user_id: str, key: str) -> None:
        with self.session_factory() as session:
            session.get(User, user_id).profile_image_key = key
            session.commit()

    def _photo_key(self, user_id: str) -> str | None:
        with self.session_factory() as session:
            return session.get(User, user_id).profile_image_key

    def test_authenticated_roles_can_upload_only_for_their_own_account(self) -> None:
        with patch("profile_photos.upload_profile_photo_object") as storage_upload:
            for user_id in USER_ROLES:
                response = self.client.post(
                    "/auth/me/profile-photo",
                    headers=self._headers(user_id),
                    files={
                        "file": (
                            "renamed.jpg",
                            self._image_bytes("PNG"),
                            "text/plain",
                        )
                    },
                )
                with self.subTest(role=USER_ROLES[user_id]):
                    self.assertEqual(response.status_code, 201)
                    self.assertTrue(response.json()["profileImageAvailable"])
                    self.assertTrue(self._photo_key(user_id).endswith(".png"))
            self.assertEqual(storage_upload.call_count, len(USER_ROLES))

        wrong_path = self.client.put(
            "/auth/users/admin/profile-photo",
            headers=self._headers("developer"),
            files={"file": ("photo.png", self._image_bytes(), "image/png")},
        )
        self.assertEqual(wrong_path.status_code, 404)

    def test_jpeg_png_and_webp_uploads_use_detected_format(self) -> None:
        expected = {
            "admin": ("image/jpeg", ".jpg"),
            "lead": ("image/png", ".png"),
            "team-leader": ("image/webp", ".webp"),
        }
        with patch("profile_photos.upload_profile_photo_object") as storage_upload:
            for user_id, image_format in (
                ("admin", "JPEG"),
                ("lead", "PNG"),
                ("team-leader", "WEBP"),
            ):
                response = self.client.post(
                    "/auth/me/profile-photo",
                    headers=self._headers(user_id),
                    files={
                        "file": (
                            "employee.dat",
                            self._image_bytes(image_format),
                            "application/octet-stream",
                        )
                    },
                )
                with self.subTest(image_format=image_format):
                    self.assertEqual(response.status_code, 201)
                    content_type, extension = expected[user_id]
                    key, content, stored_type = storage_upload.call_args.args
                    self.assertTrue(key.startswith("profile-photos/"))
                    self.assertTrue(key.endswith(extension))
                    self.assertEqual(stored_type, content_type)
                    self.assertTrue(content)

    def test_profile_metadata_reports_photo_availability(self) -> None:
        self._set_photo_key("developer", "profile-photos/member.png")
        response = self.client.get(
            "/auth/me",
            headers=self._headers("developer"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["profileImageAvailable"])

    def test_upload_rejects_duplicate_and_update_replaces_old_object(self) -> None:
        self._set_photo_key("developer", "profile-photos/old.png")
        with patch("profile_photos.upload_profile_photo_object") as storage_upload:
            duplicate = self.client.post(
                "/auth/me/profile-photo",
                headers=self._headers("developer"),
                files={"file": ("photo.png", self._image_bytes(), "image/png")},
            )
            self.assertEqual(duplicate.status_code, 409)
            storage_upload.assert_not_called()

            with patch("profile_photos.delete_profile_photo_object") as storage_delete:
                updated = self.client.put(
                    "/auth/me/profile-photo",
                    headers=self._headers("developer"),
                    files={"file": ("photo.png", self._image_bytes(), "image/png")},
                )
            self.assertEqual(updated.status_code, 200)
            self.assertTrue(updated.json()["profileImageAvailable"])
            self.assertNotEqual(self._photo_key("developer"), "profile-photos/old.png")
            storage_upload.assert_called_once()
            storage_delete.assert_called_once_with("profile-photos/old.png")

    def test_update_without_existing_photo_returns_not_found(self) -> None:
        response = self.client.put(
            "/auth/me/profile-photo",
            headers=self._headers("developer"),
            files={"file": ("photo.png", self._image_bytes(), "image/png")},
        )
        self.assertEqual(response.status_code, 404)

    def test_retrieval_requires_auth_and_returns_private_image_bytes(self) -> None:
        self._set_photo_key("developer", "profile-photos/member.png")
        image_bytes = self._image_bytes()
        with patch(
            "profile_photos.read_profile_photo_object",
            return_value=StoredProfilePhoto(image_bytes, "image/png"),
        ) as storage_read:
            unauthenticated = self.client.get(
                "/users/developer/profile-photo",
            )
            self.assertEqual(unauthenticated.status_code, 401)

            for user_id in USER_ROLES:
                response = self.client.get(
                    "/users/developer/profile-photo",
                    headers=self._headers(user_id),
                )
                with self.subTest(role=USER_ROLES[user_id]):
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.content, image_bytes)
                    self.assertEqual(response.headers["content-type"], "image/png")
                    self.assertEqual(response.headers["cache-control"], "private, no-store")
                    self.assertEqual(response.headers["x-content-type-options"], "nosniff")
            self.assertEqual(storage_read.call_count, len(USER_ROLES))

    def test_retrieval_of_missing_photo_returns_not_found(self) -> None:
        response = self.client.get(
            "/users/developer/profile-photo",
            headers=self._headers("developer"),
        )
        self.assertEqual(response.status_code, 404)

    def test_remove_clears_own_reference_and_deletes_only_its_object(self) -> None:
        self._set_photo_key("developer", "profile-photos/member.png")
        with patch("profile_photos.delete_profile_photo_object") as storage_delete:
            response = self.client.delete(
                "/auth/me/profile-photo",
                headers=self._headers("developer"),
            )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["profileImageAvailable"])
        self.assertIsNone(self._photo_key("developer"))
        storage_delete.assert_called_once_with("profile-photos/member.png")

    def test_remove_requires_authentication_and_is_safe_without_a_photo(self) -> None:
        self.assertEqual(
            self.client.delete("/auth/me/profile-photo").status_code,
            401,
        )
        response = self.client.delete(
            "/auth/me/profile-photo",
            headers=self._headers("developer"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["profileImageAvailable"])

    def test_invalid_svg_and_malformed_content_are_rejected(self) -> None:
        invalid_files = (
            ("image.svg", b"<svg xmlns='http://www.w3.org/2000/svg'/>", "image/svg+xml"),
            ("photo.jpg", b"not an image", "image/jpeg"),
            ("animated.gif", self._image_bytes("GIF"), "image/gif"),
        )
        with patch("profile_photos.upload_profile_photo_object") as storage_upload:
            for filename, content, content_type in invalid_files:
                response = self.client.post(
                    "/auth/me/profile-photo",
                    headers=self._headers("developer"),
                    files={"file": (filename, content, content_type)},
                )
                with self.subTest(filename=filename):
                    self.assertEqual(response.status_code, 422)
            storage_upload.assert_not_called()

    def test_upload_enforces_five_megabyte_limit(self) -> None:
        response = self.client.post(
            "/auth/me/profile-photo",
            headers=self._headers("developer"),
            files={
                "file": (
                    "large.png",
                    b"x" * (5 * 1024 * 1024 + 1),
                    "image/png",
                )
            },
        )
        self.assertEqual(response.status_code, 413)

    def test_upload_requires_authentication(self) -> None:
        response = self.client.post(
            "/auth/me/profile-photo",
            files={"file": ("photo.png", self._image_bytes(), "image/png")},
        )
        self.assertEqual(response.status_code, 401)


class ProfileImageMigrationTests(unittest.TestCase):
    def test_additive_migration_is_idempotent_and_preserves_existing_users(self) -> None:
        engine = create_engine("sqlite+pysqlite:///:memory:")
        try:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "CREATE TABLE users (id VARCHAR(50) PRIMARY KEY, "
                        "name VARCHAR(100) NOT NULL)"
                    )
                )
                connection.execute(
                    text("INSERT INTO users (id, name) VALUES ('existing', 'Employee')")
                )

            migrate_profile_image_key(engine)
            migrate_profile_image_key(engine)

            columns = {
                column["name"]: column
                for column in inspect(engine).get_columns("users")
            }
            self.assertIn("profile_image_key", columns)
            self.assertTrue(columns["profile_image_key"]["nullable"])
            with engine.connect() as connection:
                row = connection.execute(
                    text("SELECT id, name, profile_image_key FROM users")
                ).one()
            self.assertEqual(tuple(row), ("existing", "Employee", None))
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()

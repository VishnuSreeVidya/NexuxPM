import unittest

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from auth import (
    _user_profile,
    get_current_user,
    require_roles,
    switch_role,
)
from database import Base
from models import User, UserRoleAssignment
from schemas import RoleSwitchRequest
from security import create_access_token


class UserRoleAuthenticationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.multi_role_user = User(
            id="test-multi-role",
            name="Multi Role",
            email="multi@example.test",
            password_hash="unused",
            role="PROJECT_LEAD",
        )
        self.single_role_user = User(
            id="test-single-role",
            name="Single Role",
            email="single@example.test",
            password_hash="unused",
            role="DEVELOPER",
        )
        self.session.add_all([self.multi_role_user, self.single_role_user])
        self.session.flush()
        self.session.add_all(
            [
                UserRoleAssignment(
                    user_id=self.multi_role_user.id,
                    role="PROJECT_LEAD",
                ),
                UserRoleAssignment(
                    user_id=self.multi_role_user.id,
                    role="TEAM_LEADER",
                ),
                UserRoleAssignment(
                    user_id=self.single_role_user.id,
                    role="DEVELOPER",
                ),
            ]
        )
        self.session.commit()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()

    def credentials(self, user_id: str, role: str) -> HTTPAuthorizationCredentials:
        return HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=create_access_token(user_id, role),
        )

    def test_switch_issues_token_for_an_assigned_role(self) -> None:
        current_user = get_current_user(
            self.credentials("test-multi-role", "PROJECT_LEAD"),
            self.session,
        )

        response = switch_role(
            RoleSwitchRequest(role="TEAM_LEADER"),
            self.session,
            current_user,
        )
        switched_user = get_current_user(
            self.credentials_from_token(response.access_token),
            self.session,
        )
        profile = _user_profile(switched_user, switched_user.active_role)

        self.assertEqual(switched_user.active_role, "TEAM_LEADER")
        self.assertEqual(profile.roles, ["PROJECT_LEAD", "TEAM_LEADER"])
        self.assertEqual(profile.active_role, "TEAM_LEADER")
        self.assertEqual(require_roles("TEAM_LEADER")(switched_user), switched_user)
        with self.assertRaises(HTTPException) as error:
            require_roles("PROJECT_LEAD")(switched_user)
        self.assertEqual(error.exception.status_code, 403)

    def test_unassigned_role_switch_is_forbidden(self) -> None:
        current_user = get_current_user(
            self.credentials("test-single-role", "DEVELOPER"),
            self.session,
        )

        with self.assertRaises(HTTPException) as error:
            switch_role(
                RoleSwitchRequest(role="QA_ENGINEER"),
                self.session,
                current_user,
            )

        self.assertEqual(error.exception.status_code, 403)

    def test_revoked_role_invalidates_existing_token(self) -> None:
        credentials = self.credentials("test-multi-role", "TEAM_LEADER")
        assignment = self.session.get(
            UserRoleAssignment,
            ("test-multi-role", "TEAM_LEADER"),
        )
        self.session.delete(assignment)
        self.session.commit()

        with self.assertRaises(HTTPException) as error:
            get_current_user(credentials, self.session)

        self.assertEqual(error.exception.status_code, 403)

    def test_single_role_profile_keeps_existing_default(self) -> None:
        current_user = get_current_user(
            self.credentials("test-single-role", "DEVELOPER"),
            self.session,
        )
        profile = _user_profile(current_user, current_user.active_role)

        self.assertEqual(profile.role, "DEVELOPER")
        self.assertEqual(profile.roles, ["DEVELOPER"])

    def credentials_from_token(
        self,
        token: str,
    ) -> HTTPAuthorizationCredentials:
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


if __name__ == "__main__":
    unittest.main()

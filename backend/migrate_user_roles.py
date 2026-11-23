import sys
from typing import get_args

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from database import engine
from models import User, UserRoleAssignment
from schemas import UserRole


VALID_ROLES = frozenset(get_args(UserRole))


def migrate_user_roles() -> None:
    UserRoleAssignment.__table__.create(bind=engine, checkfirst=True)

    with engine.begin() as connection:
        legacy_roles = connection.execute(
            select(User.id, User.role)
        ).all()
        invalid_roles = [
            role for _, role in legacy_roles if role not in VALID_ROLES
        ]
        if invalid_roles:
            raise RuntimeError(
                "The users table contains unsupported roles. Correct them before "
                "running this migration."
            )

        if legacy_roles:
            connection.execute(
                insert(UserRoleAssignment)
                .values(
                    [
                        {"user_id": user_id, "role": role}
                        for user_id, role in legacy_roles
                    ]
                )
                .on_conflict_do_nothing(
                    index_elements=["user_id", "role"],
                )
            )

    print("User-role migration completed; existing roles were preserved.")


if __name__ == "__main__":
    try:
        migrate_user_roles()
    except Exception as error:
        print(
            f"User-role migration failed: {type(error).__name__}: {error}",
            file=sys.stderr,
        )
        raise

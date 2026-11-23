import sys

from database import Base, engine
import models  # noqa: F401
from migrate_profile_image_key import migrate_profile_image_key
from migrate_user_roles import migrate_user_roles


def initialize_database() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        migrate_user_roles()
        migrate_profile_image_key()
    except Exception as error:
        print(
            f"Database initialization failed: {type(error).__name__}: {error}",
            file=sys.stderr,
        )
        raise

    print("Database initialization successful. Missing tables were created.")


if __name__ == "__main__":
    initialize_database()

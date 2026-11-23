import sys

from sqlalchemy import String, inspect, text

from database import engine


def migrate_profile_image_key(connection_engine=engine) -> None:
    with connection_engine.begin() as connection:
        inspector = inspect(connection)
        if "users" not in inspector.get_table_names():
            raise RuntimeError(
                "Cannot add profile_image_key; the users table does not exist."
            )

        columns = {
            column["name"] for column in inspector.get_columns("users")
        }
        if "profile_image_key" not in columns:
            column_type = String(512).compile(dialect=connection.dialect)
            connection.execute(
                text(
                    "ALTER TABLE users "
                    f"ADD COLUMN profile_image_key {column_type} NULL"
                )
            )

    print("Profile-image migration completed; existing users were preserved.")


if __name__ == "__main__":
    try:
        migrate_profile_image_key()
    except Exception as error:
        print(
            f"Profile-image migration failed: {type(error).__name__}: {error}",
            file=sys.stderr,
        )
        raise

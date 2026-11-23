import sys

from sqlalchemy import DateTime, inspect, text

from database import engine


SOFT_DELETE_TABLES = ("projects", "tasks", "bugs")


def migrate_soft_delete(connection_engine=engine) -> None:
    with connection_engine.begin() as connection:
        inspector = inspect(connection)
        existing_tables = set(inspector.get_table_names())
        missing_tables = set(SOFT_DELETE_TABLES) - existing_tables
        if missing_tables:
            missing = ", ".join(sorted(missing_tables))
            raise RuntimeError(
                f"Cannot add soft-delete columns; required tables are missing: {missing}."
            )

        column_type = DateTime(timezone=True).compile(
            dialect=connection.dialect
        )
        for table_name in SOFT_DELETE_TABLES:
            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            if "deleted_at" in existing_columns:
                continue
            connection.execute(
                text(
                    f"ALTER TABLE {table_name} "
                    f"ADD COLUMN deleted_at {column_type} NULL"
                )
            )

    print("Soft-delete migration completed; existing records were preserved.")


if __name__ == "__main__":
    try:
        migrate_soft_delete()
    except Exception as error:
        print(
            f"Soft-delete migration failed: {type(error).__name__}: {error}",
            file=sys.stderr,
        )
        raise

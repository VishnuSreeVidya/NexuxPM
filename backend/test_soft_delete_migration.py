import unittest

from sqlalchemy import create_engine, inspect, text

from migrate_soft_delete import migrate_soft_delete


class SoftDeleteMigrationTests(unittest.TestCase):
    def test_migration_adds_nullable_columns_and_preserves_rows_idempotently(self) -> None:
        engine = create_engine("sqlite+pysqlite:///:memory:")
        try:
            with engine.begin() as connection:
                for table in ("projects", "tasks", "bugs"):
                    connection.execute(
                        text(f"CREATE TABLE {table} (id INTEGER PRIMARY KEY)")
                    )
                    connection.execute(
                        text(f"INSERT INTO {table} (id) VALUES (1)")
                    )

            migrate_soft_delete(engine)
            migrate_soft_delete(engine)

            inspector = inspect(engine)
            for table in ("projects", "tasks", "bugs"):
                columns = {
                    column["name"]: column
                    for column in inspector.get_columns(table)
                }
                self.assertIn("deleted_at", columns)
                self.assertTrue(columns["deleted_at"]["nullable"])
                with engine.connect() as connection:
                    self.assertEqual(
                        connection.scalar(
                            text(f"SELECT COUNT(*) FROM {table}")
                        ),
                        1,
                    )
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()

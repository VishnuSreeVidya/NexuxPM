import base64
import hashlib
import json
import secrets
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    Activity,
    Bug,
    Milestone,
    Notification,
    Project,
    ProjectTeamLeader,
    Report,
    Task,
    TaskComment,
    User,
    UserRoleAssignment,
)


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PBKDF2_ITERATIONS = 600_000


def load_seed_data() -> dict[str, Any]:
    node_script = """
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { createSeedData } = await server.ssrLoadModule('/src/services/seedData.js');
  process.stdout.write(JSON.stringify(createSeedData()));
} finally {
  await server.close();
}
"""
    try:
        result = subprocess.run(
            ["node", "--input-type=module", "-e", node_script],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            cwd=PROJECT_ROOT,
        )
    except FileNotFoundError as error:
        raise RuntimeError(
            "Node.js is required to load src/services/seedData.js."
        ) from error
    except subprocess.CalledProcessError as error:
        details = error.stderr.strip() or error.stdout.strip()
        raise RuntimeError(f"Could not load frontend seed data: {details}") from error

    seed_data = json.loads(result.stdout)
    if not isinstance(seed_data, dict):
        raise ValueError("Frontend seed data must be a JSON object.")
    return seed_data


def parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    encoded_salt = base64.urlsafe_b64encode(salt).decode("ascii")
    encoded_digest = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${encoded_salt}${encoded_digest}"


def add_if_missing(
    session: Session,
    model: type[Any],
    record_id: str,
    **values: Any,
) -> bool:
    if session.get(model, record_id) is not None:
        return False
    session.add(model(id=record_id, **values))
    return True


def import_seed_data(session: Session, seed_data: dict[str, Any]) -> dict[str, dict[str, int]]:
    summary: dict[str, dict[str, int]] = {}

    def insert(category: str, inserted: bool) -> None:
        counts = summary.setdefault(category, {"inserted": 0, "skipped": 0})
        counts["inserted" if inserted else "skipped"] += 1

    for row in seed_data["users"]:
        user = session.get(User, row["id"])
        if user is None:
            values = {
                "name": row["name"],
                "email": row["email"],
                "password_hash": hash_password(row["password"]),
                "role": row["role"],
                "department": row.get("department"),
                "title": row.get("title"),
                "avatar_color": row.get("avatarColor"),
                "phone": row.get("phone"),
                "location": row.get("location"),
                "bio": row.get("bio"),
                "joined_at": parse_datetime(row.get("joinedAt")),
                "last_login_at": parse_datetime(row.get("lastLoginAt")),
            }
            user = User(id=row["id"], **values)
            session.add(user)
            insert("users", True)
        else:
            insert("users", False)

        role_assignment = session.get(
            UserRoleAssignment,
            (user.id, user.role),
        )
        if role_assignment is None:
            session.add(
                UserRoleAssignment(user_id=user.id, role=user.role)
            )
        insert("user_roles", role_assignment is None)

    for row in seed_data["projects"]:
        values = {
            "name": row["name"],
            "code": row["code"],
            "description": row["description"],
            "status": row["status"],
            "priority": row["priority"],
            "start_date": parse_date(row.get("startDate")),
            "end_date": parse_date(row.get("endDate")),
            "lead_id": row["leadId"],
            "created_by": row["createdBy"],
            "created_at": parse_datetime(row["createdAt"]),
            "updated_at": parse_datetime(row["updatedAt"]),
        }
        insert("projects", add_if_missing(session, Project, row["id"], **values))

    for row in seed_data["projects"]:
        for team_leader_id in row["teamLeaderIds"]:
            assignment_key = (row["id"], team_leader_id)
            exists = session.get(ProjectTeamLeader, assignment_key) is not None
            if not exists:
                session.add(
                    ProjectTeamLeader(
                        project_id=row["id"],
                        team_leader_id=team_leader_id,
                    )
                )
            insert("project_team_leaders", not exists)

    for row in seed_data["tasks"]:
        values = {
            "project_id": row["projectId"],
            "title": row["title"],
            "description": row["description"],
            "assignee_id": row.get("assigneeId"),
            "qa_id": row.get("qaId"),
            "priority": row["priority"],
            "status": row["status"],
            "start_date": parse_date(row.get("startDate")),
            "due_date": parse_date(row.get("dueDate")),
            "progress": row["progress"],
            "created_by": row["createdBy"],
            "created_at": parse_datetime(row["createdAt"]),
            "updated_at": parse_datetime(row["updatedAt"]),
        }
        insert("tasks", add_if_missing(session, Task, row["id"], **values))

        for comment in row.get("comments", []):
            comment_values = {
                "task_id": row["id"],
                "author_id": comment["authorId"],
                "body": comment["body"],
                "created_at": parse_datetime(comment["createdAt"]),
            }
            insert(
                "task_comments",
                add_if_missing(
                    session,
                    TaskComment,
                    comment["id"],
                    **comment_values,
                ),
            )

    for row in seed_data["milestones"]:
        values = {
            "project_id": row["projectId"],
            "title": row["title"],
            "description": row["description"],
            "due_date": parse_date(row["dueDate"]),
            "status": row["status"],
            "created_by": row["createdBy"],
            "created_at": parse_datetime(row["createdAt"]),
        }
        insert("milestones", add_if_missing(session, Milestone, row["id"], **values))

    for row in seed_data["bugs"]:
        values = {
            "title": row["title"],
            "description": row["description"],
            "project_id": row["projectId"],
            "task_id": row["taskId"],
            "severity": row["severity"],
            "status": row["status"],
            "reported_by": row["reportedBy"],
            "assigned_to": row.get("assignedTo"),
            "verified_by": row.get("verifiedBy"),
            "created_at": parse_datetime(row["createdAt"]),
            "updated_at": parse_datetime(row["updatedAt"]),
        }
        insert("bugs", add_if_missing(session, Bug, row["id"], **values))

    for row in seed_data["reports"]:
        values = {
            "title": row["title"],
            "type": row["type"],
            "project_id": row["projectId"],
            "author_id": row["authorId"],
            "summary": row["summary"],
            "metrics": row["metrics"],
            "created_at": parse_datetime(row["createdAt"]),
        }
        insert("reports", add_if_missing(session, Report, row["id"], **values))

    for row in seed_data["activities"]:
        values = {
            "actor_id": row["actorId"],
            "project_id": row.get("projectId"),
            "description": row["description"],
            "timestamp": parse_datetime(row["timestamp"]),
            "created_at": parse_datetime(row["createdAt"]),
            "order": row["order"],
        }
        insert("activities", add_if_missing(session, Activity, row["id"], **values))

    for row in seed_data["notifications"]:
        values = {
            "user_id": row["userId"],
            "type": row["type"],
            "title": row["title"],
            "message": row["message"],
            "link": row["link"],
            "read": row["read"],
            "created_at": parse_datetime(row["createdAt"]),
        }
        insert("notifications", add_if_missing(session, Notification, row["id"], **values))

    return summary


def main() -> None:
    try:
        seed_data = load_seed_data()
        with SessionLocal() as session:
            with session.begin():
                summary = import_seed_data(session, seed_data)
    except Exception as error:
        print(
            "Database seeding failed; any active database transaction was rolled "
            f"back: {type(error).__name__}: {error}",
            file=sys.stderr,
        )
        raise

    print("Database seeding completed.")
    for category, counts in summary.items():
        print(
            f"  {category}: "
            f"{counts['inserted']} inserted, {counts['skipped']} skipped"
        )


if __name__ == "__main__":
    main()

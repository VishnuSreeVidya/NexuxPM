import unittest
from datetime import date, datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app
from models import (
    Activity,
    Bug,
    Notification,
    Project,
    ProjectTeamLeader,
    Task,
    TaskComment,
    User,
    UserRoleAssignment,
)
from security import create_access_token


class WorkspaceApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
        self._create_records()
        app.dependency_overrides[get_db] = self._get_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def _get_db(self):
        with self.session_factory() as session:
            yield session

    def _create_records(self) -> None:
        now = datetime.now(timezone.utc)
        users = [
            User(id="sa", name="Admin", email="admin@example.test", password_hash="unused", role="SUPER_ADMIN"),
            User(id="pl", name="Lead", email="lead@example.test", password_hash="unused", role="PROJECT_LEAD"),
            User(id="tl", name="Team Lead", email="tl@example.test", password_hash="unused", role="TEAM_LEADER"),
            User(id="dev", name="Developer", email="dev@example.test", password_hash="unused", role="DEVELOPER"),
            User(id="qa", name="QA", email="qa@example.test", password_hash="unused", role="QA_ENGINEER"),
            User(id="other", name="Other Developer", email="other@example.test", password_hash="not-returned", role="DEVELOPER"),
            User(id="other-pl", name="Other Lead", email="other-pl@example.test", password_hash="unused", role="PROJECT_LEAD"),
        ]
        roles = [
            UserRoleAssignment(user_id=user.id, role=user.role)
            for user in users
        ]
        project = Project(
            id="project-visible",
            name="Visible Project",
            code="VIS",
            description="",
            status="active",
            priority="medium",
            start_date=date.today(),
            end_date=date.today(),
            lead_id="pl",
            created_by="sa",
            created_at=now,
            updated_at=now,
        )
        hidden_project = Project(
            id="project-hidden",
            name="Hidden Project",
            code="HID",
            description="",
            status="active",
            priority="medium",
            start_date=date.today(),
            end_date=date.today(),
            lead_id="other-pl",
            created_by="sa",
            created_at=now,
            updated_at=now,
        )
        hidden_task = Task(
            id="task-hidden",
            project_id=hidden_project.id,
            title="Hidden task",
            description="",
            assignee_id="other",
            qa_id="qa",
            priority="medium",
            status="todo",
            start_date=date.today(),
            due_date=date.today(),
            progress=0,
            created_by="sa",
            created_at=now,
            updated_at=now,
        )
        task = Task(
            id="task-visible",
            project_id=project.id,
            title="Visible task",
            description="",
            assignee_id="dev",
            qa_id="qa",
            priority="medium",
            status="in_progress",
            start_date=date.today(),
            due_date=date.today(),
            progress=10,
            created_by="tl",
            created_at=now,
            updated_at=now,
        )
        in_progress_bug = Bug(
            id="bug-in-progress",
            title="In-progress defect",
            description="",
            project_id=project.id,
            task_id=task.id,
            severity="medium",
            status="in_progress",
            reported_by="qa",
            assigned_to="dev",
            verified_by=None,
            created_at=now,
            updated_at=now,
        )
        task_comment = TaskComment(
            id="comment-visible",
            task_id=task.id,
            author_id="dev",
            body="Existing comment",
            created_at=now,
        )
        activity_rows = [
            Activity(
                id="activity-visible",
                actor_id="tl",
                project_id=project.id,
                description="updated visible project",
                timestamp=now,
                created_at=now,
                order=1,
            ),
            Activity(
                id="activity-hidden",
                actor_id="other-pl",
                project_id=hidden_project.id,
                description="updated hidden project",
                timestamp=now,
                created_at=now,
                order=2,
            ),
            Activity(
                id="activity-global-dev",
                actor_id="dev",
                project_id=None,
                description="developer global event",
                timestamp=now,
                created_at=now,
                order=3,
            ),
        ]
        notifications = [
            Notification(
                id="notification-dev",
                user_id="dev",
                type="task",
                title="Assigned",
                message="Visible task",
                link="/tasks",
                read=False,
                created_at=now,
            ),
            Notification(
                id="notification-qa",
                user_id="qa",
                type="task",
                title="QA update",
                message="Visible task",
                link="/tasks",
                read=False,
                created_at=now,
            ),
        ]
        with self.session_factory() as session:
            session.add_all(
                users
                + roles
                + [
                    project,
                    hidden_project,
                    task,
                    hidden_task,
                    in_progress_bug,
                    task_comment,
                    *activity_rows,
                    *notifications,
                ]
            )
            session.add(ProjectTeamLeader(project_id=project.id, team_leader_id="tl"))
            session.commit()

    def headers(self, user_id: str, role: str) -> dict[str, str]:
        token = create_access_token(user_id, role)
        return {"Authorization": f"Bearer {token}"}

    def test_comments_persist_and_obey_task_visibility(self) -> None:
        developer = self.headers("dev", "DEVELOPER")
        response = self.client.post(
            "/tasks/task-visible/comments",
            headers=developer,
            json={"body": "  Persisted update  "},
        )
        self.assertEqual(response.status_code, 201)
        comment = response.json()
        self.assertEqual(comment["body"], "Persisted update")
        self.assertEqual(comment["author"], {"id": "dev", "name": "Developer"})
        self.assertNotIn("password", comment["author"])

        refreshed = self.client.get(
            "/tasks/task-visible/comments",
            headers=developer,
        )
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn(
            comment["id"],
            {item["id"] for item in refreshed.json()},
        )
        unauthorized = self.client.get(
            "/tasks/task-visible/comments",
            headers=self.headers("other", "DEVELOPER"),
        )
        self.assertEqual(unauthorized.status_code, 404)
        blank = self.client.post(
            "/tasks/task-visible/comments",
            headers=developer,
            json={"body": "   "},
        )
        self.assertEqual(blank.status_code, 422)

    def test_developer_can_submit_in_progress_bug_for_qa_review(self) -> None:
        fixed = self.client.put(
            "/bugs/bug-in-progress",
            headers=self.headers("dev", "DEVELOPER"),
            json={"status": "fixed"},
        )
        self.assertEqual(fixed.status_code, 200)
        self.assertEqual(fixed.json()["status"], "fixed")

        verified = self.client.put(
            "/bugs/bug-in-progress",
            headers=self.headers("qa", "QA_ENGINEER"),
            json={"status": "verified"},
        )
        self.assertEqual(verified.status_code, 200)
        self.assertEqual(verified.json()["status"], "verified")

    def test_activity_is_scoped_and_paginated(self) -> None:
        admin = self.client.get("/activity?limit=1", headers=self.headers("sa", "SUPER_ADMIN"))
        self.assertEqual(admin.status_code, 200)
        self.assertEqual(len(admin.json()), 1)

        lead = self.client.get("/activity?limit=100", headers=self.headers("pl", "PROJECT_LEAD"))
        self.assertEqual(lead.status_code, 200)
        self.assertIn("activity-visible", {item["id"] for item in lead.json()})
        self.assertNotIn("activity-hidden", {item["id"] for item in lead.json()})

        developer = self.client.get("/activity?limit=100", headers=self.headers("dev", "DEVELOPER"))
        self.assertEqual([item["id"] for item in developer.json()], ["activity-global-dev"])

    def test_notifications_are_private_and_read_state_persists(self) -> None:
        developer = self.headers("dev", "DEVELOPER")
        listing = self.client.get("/notifications", headers=developer)
        self.assertEqual(listing.status_code, 200)
        self.assertEqual([item["id"] for item in listing.json()], ["notification-dev"])

        marked = self.client.put(
            "/notifications/notification-dev/read",
            headers=developer,
        )
        self.assertEqual(marked.status_code, 200)
        self.assertTrue(marked.json()["read"])
        hidden = self.client.put(
            "/notifications/notification-qa/read",
            headers=developer,
        )
        self.assertEqual(hidden.status_code, 404)

        mark_all = self.client.put("/notifications/read-all", headers=self.headers("qa", "QA_ENGINEER"))
        self.assertEqual(mark_all.status_code, 200)
        self.assertTrue(all(item["read"] for item in mark_all.json()))

    def test_assignable_users_are_role_and_project_scoped(self) -> None:
        admin = self.client.get(
            "/users?role=PROJECT_LEAD",
            headers=self.headers("sa", "SUPER_ADMIN"),
        )
        self.assertEqual(admin.status_code, 200)
        self.assertEqual({user["id"] for user in admin.json()}, {"pl", "other-pl"})
        self.assertEqual(set(admin.json()[0]), {"id", "name", "email", "roles"})

        lead = self.client.get(
            "/users?role=TEAM_LEADER&projectId=project-visible",
            headers=self.headers("pl", "PROJECT_LEAD"),
        )
        self.assertEqual(lead.status_code, 200)
        self.assertEqual({user["id"] for user in lead.json()}, {"tl"})

        team_lead = self.client.get(
            "/users?role=DEVELOPER&projectId=project-visible",
            headers=self.headers("tl", "TEAM_LEADER"),
        )
        self.assertEqual(team_lead.status_code, 200)
        self.assertEqual({user["id"] for user in team_lead.json()}, {"dev", "other"})

        wrong_project = self.client.get(
            "/users?role=DEVELOPER&projectId=project-hidden",
            headers=self.headers("tl", "TEAM_LEADER"),
        )
        self.assertEqual(wrong_project.status_code, 404)
        forbidden = self.client.get(
            "/users?role=DEVELOPER&projectId=project-visible",
            headers=self.headers("dev", "DEVELOPER"),
        )
        self.assertEqual(forbidden.status_code, 403)
        self.assertNotIn("password_hash", str(team_lead.json()))

    def test_super_admin_soft_deletes_project_without_removing_dependents(self) -> None:
        response = self.client.delete(
            "/projects/project-visible",
            headers=self.headers("sa", "SUPER_ADMIN"),
        )
        self.assertEqual(response.status_code, 204)

        with self.session_factory() as session:
            project = session.get(Project, "project-visible")
            task = session.get(Task, "task-visible")
            bug = session.get(Bug, "bug-in-progress")
            comment = session.get(TaskComment, "comment-visible")
            activity = session.get(Activity, "activity-visible")
            notification = session.get(Notification, "notification-dev")
            self.assertIsNotNone(project.deleted_at)
            self.assertIsNone(task.deleted_at)
            self.assertIsNone(bug.deleted_at)
            self.assertEqual(comment.body, "Existing comment")
            self.assertEqual(activity.description, "updated visible project")
            self.assertEqual(notification.message, "Visible task")

        self.assertEqual(
            self.client.get(
                "/projects/project-visible",
                headers=self.headers("sa", "SUPER_ADMIN"),
            ).status_code,
            404,
        )
        self.assertNotIn(
            "task-visible",
            {task["id"] for task in self.client.get(
                "/tasks",
                headers=self.headers("sa", "SUPER_ADMIN"),
            ).json()},
        )
        self.assertNotIn(
            "bug-in-progress",
            {bug["id"] for bug in self.client.get(
                "/bugs",
                headers=self.headers("sa", "SUPER_ADMIN"),
            ).json()},
        )
        self.assertEqual(
            self.client.get(
                "/tasks/task-visible",
                headers=self.headers("sa", "SUPER_ADMIN"),
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(
                "/bugs/bug-in-progress",
                headers=self.headers("sa", "SUPER_ADMIN"),
            ).status_code,
            404,
        )

    def test_super_admin_soft_deletes_tasks_and_bugs(self) -> None:
        admin = self.headers("sa", "SUPER_ADMIN")
        delete_bug = self.client.delete("/bugs/bug-in-progress", headers=admin)
        self.assertEqual(delete_bug.status_code, 204)
        self.assertEqual(
            self.client.get("/bugs/bug-in-progress", headers=admin).status_code,
            404,
        )

        delete_task = self.client.delete("/tasks/task-visible", headers=admin)
        self.assertEqual(delete_task.status_code, 204)
        self.assertEqual(
            self.client.get("/tasks/task-visible", headers=admin).status_code,
            404,
        )
        self.assertEqual(
            self.client.get("/tasks/task-visible/comments", headers=admin).status_code,
            404,
        )
        with self.session_factory() as session:
            self.assertIsNotNone(session.get(Task, "task-visible").deleted_at)
            self.assertIsNotNone(session.get(Bug, "bug-in-progress").deleted_at)
            self.assertIsNotNone(session.get(TaskComment, "comment-visible"))
            self.assertIsNotNone(session.get(Activity, "activity-visible"))
            self.assertIsNotNone(session.get(Notification, "notification-dev"))

    def test_team_leader_can_delete_task_only_in_assigned_project(self) -> None:
        team_leader = self.headers("tl", "TEAM_LEADER")
        allowed = self.client.delete("/tasks/task-visible", headers=team_leader)
        self.assertEqual(allowed.status_code, 204)

        outside_project = self.client.delete("/tasks/task-hidden", headers=team_leader)
        self.assertEqual(outside_project.status_code, 403)
        with self.session_factory() as session:
            self.assertIsNotNone(session.get(Task, "task-visible").deleted_at)
            self.assertIsNone(session.get(Task, "task-hidden").deleted_at)

    def test_non_admin_roles_cannot_delete_visible_resources(self) -> None:
        for user_id, role in (
            ("pl", "PROJECT_LEAD"),
            ("dev", "DEVELOPER"),
            ("qa", "QA_ENGINEER"),
        ):
            headers = self.headers(user_id, role)
            for path in (
                "/projects/project-visible",
                "/tasks/task-visible",
                "/bugs/bug-in-progress",
            ):
                with self.subTest(user_id=user_id, path=path):
                    response = self.client.delete(path, headers=headers)
                    self.assertEqual(response.status_code, 403)

        team_leader = self.headers("tl", "TEAM_LEADER")
        self.assertEqual(
            self.client.delete(
                "/projects/project-visible",
                headers=team_leader,
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.delete(
                "/bugs/bug-in-progress",
                headers=team_leader,
            ).status_code,
            403,
        )

    def test_delete_authentication_missing_invalid_and_resource_not_found(self) -> None:
        for path in (
            "/projects/project-visible",
            "/tasks/task-visible",
            "/bugs/bug-in-progress",
        ):
            with self.subTest(path=path, credentials="missing"):
                self.assertEqual(self.client.delete(path).status_code, 401)
            with self.subTest(path=path, credentials="invalid"):
                self.assertEqual(
                    self.client.delete(
                        path,
                        headers={"Authorization": "Bearer invalid"},
                    ).status_code,
                    401,
                )

        admin = self.headers("sa", "SUPER_ADMIN")
        for path in (
            "/projects/nonexistent",
            "/tasks/nonexistent",
            "/bugs/nonexistent",
        ):
            with self.subTest(path=path):
                self.assertEqual(
                    self.client.delete(path, headers=admin).status_code,
                    404,
                )

        self.assertEqual(
            self.client.delete(
                "/bugs/bug-in-progress",
                headers=admin,
            ).status_code,
            204,
        )
        self.assertEqual(
            self.client.delete(
                "/bugs/bug-in-progress",
                headers=admin,
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(
                "/tasks/task-visible",
                headers=admin,
            ).status_code,
            204,
        )
        self.assertEqual(
            self.client.delete(
                "/tasks/task-visible",
                headers=admin,
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(
                "/projects/project-visible",
                headers=admin,
            ).status_code,
            204,
        )
        self.assertEqual(
            self.client.delete(
                "/projects/project-visible",
                headers=admin,
            ).status_code,
            404,
        )

    def test_delete_is_allowed_by_cors_preflight(self) -> None:
        response = self.client.options(
            "/projects/project-visible",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "DELETE",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("DELETE", response.headers["access-control-allow-methods"])


if __name__ == "__main__":
    unittest.main()

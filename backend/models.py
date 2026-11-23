from datetime import date, datetime
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100))
    title: Mapped[str | None] = mapped_column(String(100))
    avatar_color: Mapped[str | None] = mapped_column(String(30))
    profile_image_key: Mapped[str | None] = mapped_column(String(512))
    phone: Mapped[str | None] = mapped_column(String(30))
    location: Mapped[str | None] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    role_assignments: Mapped[list["UserRoleAssignment"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="UserRoleAssignment.role",
    )

    led_projects: Mapped[list["Project"]] = relationship(
        back_populates="project_lead",
        foreign_keys="Project.lead_id",
    )
    created_projects: Mapped[list["Project"]] = relationship(
        back_populates="creator",
        foreign_keys="Project.created_by",
    )
    team_leader_assignments: Mapped[list["ProjectTeamLeader"]] = relationship(
        back_populates="team_leader",
        foreign_keys="ProjectTeamLeader.team_leader_id",
    )
    assigned_tasks: Mapped[list["Task"]] = relationship(
        back_populates="assignee",
        foreign_keys="Task.assignee_id",
    )
    qa_tasks: Mapped[list["Task"]] = relationship(
        back_populates="qa_engineer",
        foreign_keys="Task.qa_id",
    )
    task_comments: Mapped[list["TaskComment"]] = relationship(back_populates="author")
    created_milestones: Mapped[list["Milestone"]] = relationship(back_populates="creator")
    reported_bugs: Mapped[list["Bug"]] = relationship(
        back_populates="reporter",
        foreign_keys="Bug.reported_by",
    )
    assigned_bugs: Mapped[list["Bug"]] = relationship(
        back_populates="assignee",
        foreign_keys="Bug.assigned_to",
    )
    verified_bugs: Mapped[list["Bug"]] = relationship(
        back_populates="verifier",
        foreign_keys="Bug.verified_by",
    )
    reports: Mapped[list["Report"]] = relationship(back_populates="author")
    activities: Mapped[list["Activity"]] = relationship(back_populates="actor")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")

    @property
    def assigned_roles(self) -> list[str]:
        return [assignment.role for assignment in self.role_assignments]

    @property
    def active_role(self) -> str:
        return self.__dict__.get("_active_role", self.role)

    @active_role.setter
    def active_role(self, value: str) -> None:
        self.__dict__["_active_role"] = value


class UserRoleAssignment(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(String(30), primary_key=True)

    user: Mapped[User] = relationship(back_populates="role_assignments")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    priority: Mapped[str] = mapped_column(String(30), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    lead_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project_lead: Mapped["User"] = relationship(
        back_populates="led_projects",
        foreign_keys=[lead_id],
    )
    creator: Mapped["User"] = relationship(
        back_populates="created_projects",
        foreign_keys=[created_by],
    )
    team_leader_assignments: Mapped[list["ProjectTeamLeader"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )
    tasks: Mapped[list["Task"]] = relationship(back_populates="project")
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="project")
    bugs: Mapped[list["Bug"]] = relationship(back_populates="project")
    reports: Mapped[list["Report"]] = relationship(back_populates="project")
    activities: Mapped[list["Activity"]] = relationship(back_populates="project")


class ProjectTeamLeader(Base):
    __tablename__ = "project_team_leaders"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id"),
        primary_key=True,
    )
    team_leader_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"),
        primary_key=True,
    )

    project: Mapped["Project"] = relationship(back_populates="team_leader_assignments")
    team_leader: Mapped["User"] = relationship(back_populates="team_leader_assignments")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    qa_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    priority: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped["Project"] = relationship(back_populates="tasks")
    assignee: Mapped["User | None"] = relationship(
        back_populates="assigned_tasks",
        foreign_keys=[assignee_id],
    )
    qa_engineer: Mapped["User | None"] = relationship(
        back_populates="qa_tasks",
        foreign_keys=[qa_id],
    )
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
    comments: Mapped[list["TaskComment"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )
    bugs: Mapped[list["Bug"]] = relationship(back_populates="task")


class TaskComment(Base):
    __tablename__ = "task_comments"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    task: Mapped["Task"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship(back_populates="task_comments")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="milestones")
    creator: Mapped["User"] = relationship(back_populates="created_milestones")


class Bug(Base):
    __tablename__ = "bugs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    reported_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    verified_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped["Project"] = relationship(back_populates="bugs")
    task: Mapped["Task"] = relationship(back_populates="bugs")
    reporter: Mapped["User"] = relationship(
        back_populates="reported_bugs",
        foreign_keys=[reported_by],
    )
    assignee: Mapped["User | None"] = relationship(
        back_populates="assigned_bugs",
        foreign_keys=[assigned_to],
    )
    verifier: Mapped["User | None"] = relationship(
        back_populates="verified_bugs",
        foreign_keys=[verified_by],
    )


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="reports")
    author: Mapped["User"] = relationship(back_populates="reports")


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    actor: Mapped["User"] = relationship(back_populates="activities")
    project: Mapped["Project | None"] = relationship(back_populates="activities")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str] = mapped_column(String(255), nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="notifications")

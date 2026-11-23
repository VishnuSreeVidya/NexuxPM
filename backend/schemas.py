from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


UserRole = Literal[
    "SUPER_ADMIN",
    "PROJECT_LEAD",
    "TEAM_LEADER",
    "DEVELOPER",
    "QA_ENGINEER",
]


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().casefold()


class UserProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role: UserRole
    roles: list[UserRole]
    active_role: UserRole = Field(alias="activeRole")
    department: str | None
    title: str | None
    avatar_color: str | None
    profile_image_available: bool = Field(alias="profileImageAvailable")
    phone: str | None
    location: str | None
    bio: str | None
    joined_at: datetime | None
    last_login_at: datetime | None


class LoginResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserProfile


class RoleSwitchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: UserRole


ProjectPriority = Literal["low", "medium", "high", "critical"]
ProjectStatus = Literal["planning", "active", "on_hold", "completed"]


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str = Field(min_length=1, max_length=80)
    code: str | None = Field(default=None, max_length=12)
    description: str = Field(default="", max_length=500)
    lead_id: str = Field(alias="leadId", min_length=1, max_length=50)
    priority: ProjectPriority = "medium"
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Project name cannot be blank.")
        return value

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip().upper()
        return value or None

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_date_range(self) -> "ProjectCreate":
        if self.end_date < self.start_date:
            raise ValueError("endDate must be on or after startDate.")
        return self


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    lead_id: str | None = Field(default=None, alias="leadId", min_length=1, max_length=50)
    priority: ProjectPriority | None = None
    start_date: date | None = Field(default=None, alias="startDate")
    end_date: date | None = Field(default=None, alias="endDate")
    status: ProjectStatus | None = None
    team_leader_ids: list[str] | None = Field(default=None, alias="teamLeaderIds")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Project name cannot be blank.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("team_leader_ids")
    @classmethod
    def validate_unique_team_leaders(
        cls,
        value: list[str] | None,
    ) -> list[str] | None:
        if value is not None and len(value) != len(set(value)):
            raise ValueError("teamLeaderIds cannot contain duplicate user IDs.")
        return value

    @model_validator(mode="after")
    def validate_update_values(self) -> "ProjectUpdate":
        fields_set = self.model_fields_set
        for field_name in fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null.")

        start_date = self.start_date
        end_date = self.end_date
        if start_date is not None and end_date is not None and end_date < start_date:
            raise ValueError("endDate must be on or after startDate.")
        return self


class ProjectResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    code: str
    description: str
    status: ProjectStatus
    priority: ProjectPriority
    start_date: date | None = Field(alias="startDate")
    end_date: date | None = Field(alias="endDate")
    lead_id: str = Field(alias="leadId")
    team_leader_ids: list[str] = Field(alias="teamLeaderIds")
    created_by: str = Field(alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


TaskPriority = Literal["low", "medium", "high", "critical"]
TaskStatus = Literal["todo", "in_progress", "in_review", "testing", "completed"]


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    project_id: str = Field(alias="projectId", min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    assignee_id: str = Field(alias="assigneeId", min_length=1, max_length=50)
    qa_id: str = Field(alias="qaId", min_length=1, max_length=50)
    priority: TaskPriority = "medium"
    due_date: date = Field(alias="dueDate")

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Task title cannot be blank.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_due_date(self) -> "TaskCreate":
        if self.due_date < date.today():
            raise ValueError("dueDate must be today or later.")
        return self


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    title: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    assignee_id: str | None = Field(default=None, alias="assigneeId", min_length=1, max_length=50)
    qa_id: str | None = Field(default=None, alias="qaId", min_length=1, max_length=50)
    priority: TaskPriority | None = None
    due_date: date | None = Field(default=None, alias="dueDate")

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Task title cannot be blank.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def validate_update_values(self) -> "TaskUpdate":
        for field_name in self.model_fields_set:
            value = getattr(self, field_name)
            if value is None:
                raise ValueError(f"{field_name} cannot be null.")
            if field_name == "due_date" and value < date.today():
                raise ValueError("dueDate must be today or later.")
        return self


class TaskTransition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: TaskStatus


class TaskCommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Comment cannot be blank.")
        return value


class TaskCommentAuthorResponse(BaseModel):
    id: str
    name: str


class TaskCommentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    author_id: str = Field(alias="authorId")
    author: TaskCommentAuthorResponse
    body: str
    created_at: datetime = Field(alias="createdAt")


class TaskResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    project_id: str = Field(alias="projectId")
    title: str
    description: str
    assignee_id: str | None = Field(alias="assigneeId")
    qa_id: str | None = Field(alias="qaId")
    priority: TaskPriority
    status: TaskStatus
    start_date: date | None = Field(alias="startDate")
    due_date: date | None = Field(alias="dueDate")
    progress: int
    created_by: str = Field(alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    comments: list[TaskCommentResponse]


BugSeverity = Literal["low", "medium", "high", "critical"]
BugStatus = Literal["open", "in_progress", "fixed", "verified", "reopened"]


class BugCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    project_id: str = Field(alias="projectId", min_length=1, max_length=50)
    task_id: str = Field(alias="taskId", min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=1000)
    severity: BugSeverity = "medium"

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Bug title cannot be blank.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Bug description cannot be blank.")
        return value


class BugUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: BugStatus


class BugResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    description: str
    project_id: str = Field(alias="projectId")
    task_id: str = Field(alias="taskId")
    severity: BugSeverity
    status: BugStatus
    reported_by: str = Field(alias="reportedBy")
    assigned_to: str | None = Field(alias="assignedTo")
    verified_by: str | None = Field(alias="verifiedBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ActivityResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    actor_id: str = Field(alias="actorId")
    actor_name: str = Field(alias="actorName")
    actor_avatar_color: str | None = Field(alias="actorAvatarColor")
    project_id: str | None = Field(alias="projectId")
    project_name: str | None = Field(alias="projectName")
    description: str
    timestamp: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    user_id: str = Field(alias="userId")
    type: str
    title: str
    message: str
    link: str
    read: bool
    created_at: datetime = Field(alias="createdAt")


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int = Field(alias="unreadCount")


class ProfilePhotoMutationResponse(BaseModel):
    profile_image_available: bool = Field(alias="profileImageAvailable")
    cleanup_warning: bool = Field(default=False, alias="cleanupWarning")


class AssignableUserResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    email: str
    roles: list[UserRole]

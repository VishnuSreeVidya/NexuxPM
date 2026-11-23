from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import exists, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from auth import get_current_user, require_roles
from database import get_db
from models import (
    Activity,
    Bug,
    Notification,
    Project,
    ProjectTeamLeader,
    Task,
    TaskComment,
    User,
)
from schemas import (
    TaskCommentCreate,
    TaskCommentResponse,
    TaskCreate,
    TaskResponse,
    TaskTransition,
    TaskUpdate,
)


router = APIRouter()

SUPER_ADMIN = "SUPER_ADMIN"
PROJECT_LEAD = "PROJECT_LEAD"
TEAM_LEADER = "TEAM_LEADER"
DEVELOPER = "DEVELOPER"
QA_ENGINEER = "QA_ENGINEER"

TASK_TRANSITIONS = {
    "todo": {"in_progress"},
    "in_progress": {"in_review"},
    "in_review": {"testing", "in_progress"},
    "testing": {"completed", "in_progress"},
    "completed": {"in_progress"},
}


def _visible_tasks_query(user: User):
    query = (
        select(Task)
        .options(selectinload(Task.comments).selectinload(TaskComment.author))
        .join(Project, Project.id == Task.project_id)
        .where(
            Task.deleted_at.is_(None),
            Project.deleted_at.is_(None),
        )
    )
    if user.active_role == SUPER_ADMIN:
        return query
    if user.active_role == PROJECT_LEAD:
        leads_project = exists(
            select(Project.id).where(
                Project.id == Task.project_id,
                Project.lead_id == user.id,
            ).correlate_except(Project)
        )
        return query.where(leads_project)
    if user.active_role == TEAM_LEADER:
        leads_team = exists(
            select(ProjectTeamLeader.project_id).where(
                ProjectTeamLeader.project_id == Task.project_id,
                ProjectTeamLeader.team_leader_id == user.id,
            )
        )
        return query.where(leads_team)
    if user.active_role == DEVELOPER:
        return query.where(Task.assignee_id == user.id)
    if user.active_role == QA_ENGINEER:
        return query.where(Task.qa_id == user.id)
    return query.where(Task.id == "")


def _task_response(task: Task) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        projectId=task.project_id,
        title=task.title,
        description=task.description,
        assigneeId=task.assignee_id,
        qaId=task.qa_id,
        priority=task.priority,
        status=task.status,
        startDate=task.start_date,
        dueDate=task.due_date,
        progress=task.progress,
        createdBy=task.created_by,
        createdAt=task.created_at,
        updatedAt=task.updated_at,
        comments=[
            {
                "id": comment.id,
                "authorId": comment.author_id,
                "author": {
                    "id": comment.author.id,
                    "name": comment.author.name,
                },
                "body": comment.body,
                "createdAt": comment.created_at,
            }
            for comment in sorted(task.comments, key=lambda item: item.created_at)
        ],
    )


def _comment_response(comment: TaskComment) -> TaskCommentResponse:
    return TaskCommentResponse(
        id=comment.id,
        authorId=comment.author_id,
        author={"id": comment.author.id, "name": comment.author.name},
        body=comment.body,
        createdAt=comment.created_at,
    )


def _require_user_role(db: Session, user_id: str, role: str, label: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{label} '{user_id}' does not exist.",
        )
    if role not in user.assigned_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"User '{user_id}' must have the {role} role.",
        )
    return user


def _require_task_project_access(db: Session, project_id: str, user_id: str) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )
    assignment = db.scalar(
        select(ProjectTeamLeader.project_id).where(
            ProjectTeamLeader.project_id == project_id,
            ProjectTeamLeader.team_leader_id == user_id,
        )
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )
    return project


def _record_activity(
    db: Session,
    actor_id: str,
    project_id: str,
    description: str,
    now: datetime,
) -> None:
    db.add(
        Activity(
            id=f"act-{uuid4().hex}",
            actor_id=actor_id,
            project_id=project_id,
            description=description,
            timestamp=now,
            created_at=now,
            order=0,
        )
    )


def _notify_task_users(
    db: Session,
    task: Task,
    project: Project,
    actor_id: str,
    now: datetime,
    title: str,
    message: str,
) -> None:
    team_leader_ids = db.scalars(
        select(ProjectTeamLeader.team_leader_id).where(
            ProjectTeamLeader.project_id == project.id
        )
    ).all()
    recipient_ids = {
        project.lead_id,
        *team_leader_ids,
        task.assignee_id,
        task.qa_id,
    } - {actor_id, None}
    for user_id in recipient_ids:
        db.add(
            Notification(
                id=f"ntf-{uuid4().hex}",
                user_id=user_id,
                type="task",
                title=title,
                message=message,
                link="/tasks",
                read=False,
                created_at=now,
            )
        )


def _commit_task(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task could not be saved because a related record conflicts.",
        ) from error


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskResponse]:
    tasks = db.scalars(
        _visible_tasks_query(current_user).order_by(Task.created_at.desc())
    ).all()
    return [_task_response(task) for task in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    task = db.scalar(
        _visible_tasks_query(current_user).where(Task.id == task_id)
    )
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return _task_response(task)


@router.get(
    "/{task_id}/comments",
    response_model=list[TaskCommentResponse],
)
def list_task_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskCommentResponse]:
    task = db.scalar(
        _visible_tasks_query(current_user).where(Task.id == task_id)
    )
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return [
        _comment_response(comment)
        for comment in sorted(task.comments, key=lambda item: (item.created_at, item.id))
    ]


@router.post(
    "/{task_id}/comments",
    response_model=TaskCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task_comment(
    task_id: str,
    comment_data: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskCommentResponse:
    task = db.scalar(
        _visible_tasks_query(current_user).where(Task.id == task_id)
    )
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    comment = TaskComment(
        id=f"cmt-{uuid4().hex}",
        task_id=task.id,
        author_id=current_user.id,
        body=comment_data.body,
        created_at=datetime.now(timezone.utc),
    )
    db.add(comment)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Comment could not be saved.",
        ) from error
    db.refresh(comment)
    return _comment_response(comment)


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(TEAM_LEADER)),
) -> TaskResponse:
    project = _require_task_project_access(
        db,
        task_data.project_id,
        current_user.id,
    )
    _require_user_role(db, task_data.assignee_id, DEVELOPER, "Developer")
    _require_user_role(db, task_data.qa_id, QA_ENGINEER, "QA Engineer")

    now = datetime.now(timezone.utc)
    task = Task(
        id=f"tsk-{uuid4().hex}",
        project_id=project.id,
        title=task_data.title,
        description=task_data.description,
        assignee_id=task_data.assignee_id,
        qa_id=task_data.qa_id,
        priority=task_data.priority,
        status="todo",
        start_date=date.today(),
        due_date=task_data.due_date,
        progress=0,
        created_by=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    _record_activity(
        db,
        current_user.id,
        project.id,
        f"created task “{task.title}” and assigned the delivery team.",
        now,
    )
    _notify_task_users(
        db,
        task,
        project,
        current_user.id,
        now,
        "New task assigned",
        task.title,
    )
    _commit_task(db)
    db.refresh(task)
    return _task_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    task = db.scalar(
        _visible_tasks_query(current_user).where(Task.id == task_id)
    )
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    if current_user.active_role != TEAM_LEADER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned Team Leader can edit task details.",
        )

    updates = task_data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="At least one task field must be provided.",
        )
    if "assignee_id" in updates:
        _require_user_role(db, updates["assignee_id"], DEVELOPER, "Developer")
    if "qa_id" in updates:
        _require_user_role(db, updates["qa_id"], QA_ENGINEER, "QA Engineer")

    for field_name, value in updates.items():
        setattr(task, field_name, value)
    now = datetime.now(timezone.utc)
    task.updated_at = now
    description = f"updated task “{task.title}”."
    project = db.get(Project, task.project_id)
    _record_activity(db, current_user.id, task.project_id, description, now)
    _notify_task_users(
        db,
        task,
        project,
        current_user.id,
        now,
        "Task updated",
        description,
    )
    _commit_task(db)
    db.refresh(task)
    return _task_response(task)


@router.post("/{task_id}/transition", response_model=TaskResponse)
def transition_task(
    task_id: str,
    transition: TaskTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    task = db.scalar(
        _visible_tasks_query(current_user).where(Task.id == task_id)
    )
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if current_user.active_role == TEAM_LEADER:
        role_transitions = TASK_TRANSITIONS.get(task.status, set()) - {"completed"}
    elif current_user.active_role == DEVELOPER and task.assignee_id == current_user.id:
        role_transitions = {
            "todo": {"in_progress"},
            "in_progress": {"in_review"},
        }.get(task.status, set())
    elif current_user.active_role == QA_ENGINEER and task.qa_id == current_user.id:
        role_transitions = {
            "in_review": {"testing"},
            "testing": {"completed", "in_progress"},
        }.get(task.status, set())
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role or task assignment does not allow status changes.",
        )

    target_status = transition.status
    if target_status not in TASK_TRANSITIONS.get(task.status, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Task cannot move from '{task.status}' to '{target_status}'.",
        )
    if target_status not in role_transitions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot make this task status transition.",
        )
    if target_status == "completed":
        unverified_bug_id = db.scalar(
            select(Bug.id)
            .where(
                Bug.task_id == task.id,
                Bug.deleted_at.is_(None),
                Bug.status != "verified",
            )
            .limit(1)
        )
        if unverified_bug_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="All bugs linked to the task must be verified before completion.",
            )

    task.status = target_status
    if target_status == "completed":
        task.progress = 100
    elif target_status == "in_progress":
        task.progress = max(task.progress, 10)
    elif target_status in {"in_review", "testing"}:
        task.progress = max(task.progress, 90)

    now = datetime.now(timezone.utc)
    task.updated_at = now
    description = f"moved “{task.title}” to {target_status.replace('_', ' ')}."
    project = db.get(Project, task.project_id)
    _record_activity(db, current_user.id, task.project_id, description, now)
    _notify_task_users(
        db,
        task,
        project,
        current_user.id,
        now,
        "Task updated",
        description,
    )
    _commit_task(db)
    db.refresh(task)
    return _task_response(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    task = db.get(Task, task_id)
    if task is None or task.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    project = db.get(Project, task.project_id)
    if project is None or project.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if current_user.active_role == TEAM_LEADER:
        assignment = db.scalar(
            select(ProjectTeamLeader.project_id).where(
                ProjectTeamLeader.project_id == project.id,
                ProjectTeamLeader.team_leader_id == current_user.id,
            )
        )
        if assignment is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your role cannot delete this resource.",
            )
    elif current_user.active_role != SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot delete this resource.",
        )

    now = datetime.now(timezone.utc)
    result = db.execute(
        update(Task)
        .where(Task.id == task_id, Task.deleted_at.is_(None))
        .values(deleted_at=now, updated_at=now)
    )
    if result.rowcount != 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

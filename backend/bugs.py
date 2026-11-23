from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import exists, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import get_current_user, require_roles
from database import get_db
from models import (
    Activity,
    Bug,
    Notification,
    Project,
    ProjectTeamLeader,
    Task,
    User,
)
from schemas import BugCreate, BugResponse, BugUpdate


router = APIRouter()

SUPER_ADMIN = "SUPER_ADMIN"
PROJECT_LEAD = "PROJECT_LEAD"
TEAM_LEADER = "TEAM_LEADER"
DEVELOPER = "DEVELOPER"
QA_ENGINEER = "QA_ENGINEER"

BUG_REPORTABLE_TASK_STATUSES = {"in_review", "testing"}
BUG_FIXABLE_STATUSES = {"open", "in_progress", "reopened"}


def _visible_bugs_query(user: User):
    query = (
        select(Bug)
        .join(Project, Project.id == Bug.project_id)
        .join(Task, Task.id == Bug.task_id)
        .where(
            Bug.deleted_at.is_(None),
            Project.deleted_at.is_(None),
            Task.deleted_at.is_(None),
            Task.project_id == Bug.project_id,
        )
    )
    if user.active_role == SUPER_ADMIN:
        return query
    if user.active_role == PROJECT_LEAD:
        leads_project = exists(
            select(Project.id).where(
                Project.id == Bug.project_id,
                Project.lead_id == user.id,
            ).correlate_except(Project)
        )
        return query.where(leads_project)
    if user.active_role == TEAM_LEADER:
        leads_team = exists(
            select(ProjectTeamLeader.project_id).where(
                ProjectTeamLeader.project_id == Bug.project_id,
                ProjectTeamLeader.team_leader_id == user.id,
            )
        )
        return query.where(leads_team)
    if user.active_role == DEVELOPER:
        return query.where(Bug.assigned_to == user.id)
    if user.active_role == QA_ENGINEER:
        assigned_task = exists(
            select(Task.id).where(
                Task.id == Bug.task_id,
                Task.qa_id == user.id,
            ).correlate_except(Task)
        )
        return query.where(
            (Bug.reported_by == user.id)
            | (Bug.verified_by == user.id)
            | assigned_task
        )
    return query.where(Bug.id == "")


def _bug_response(bug: Bug) -> BugResponse:
    return BugResponse(
        id=bug.id,
        title=bug.title,
        description=bug.description,
        projectId=bug.project_id,
        taskId=bug.task_id,
        severity=bug.severity,
        status=bug.status,
        reportedBy=bug.reported_by,
        assignedTo=bug.assigned_to,
        verifiedBy=bug.verified_by,
        createdAt=bug.created_at,
        updatedAt=bug.updated_at,
    )


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


def _notify_users(
    db: Session,
    user_ids: set[str],
    actor_id: str,
    title: str,
    message: str,
    now: datetime,
    exclude_actor: bool = True,
) -> None:
    recipients = user_ids - {actor_id} if exclude_actor else user_ids
    for user_id in recipients:
        db.add(
            Notification(
                id=f"ntf-{uuid4().hex}",
                user_id=user_id,
                type="bug",
                title=title,
                message=message,
                link="/tasks",
                read=False,
                created_at=now,
            )
        )


def _bug_project_members(db: Session, project_id: str) -> set[str]:
    project = db.get(Project, project_id)
    member_ids = {project.lead_id}
    member_ids.update(
        db.scalars(
            select(ProjectTeamLeader.team_leader_id).where(
                ProjectTeamLeader.project_id == project_id
            )
        ).all()
    )
    for user_id in db.scalars(
        select(Task.assignee_id).where(
            Task.project_id == project_id,
            Task.assignee_id.is_not(None),
        )
    ).all():
        member_ids.add(user_id)
    for user_id in db.scalars(
        select(Task.qa_id).where(
            Task.project_id == project_id,
            Task.qa_id.is_not(None),
        )
    ).all():
        member_ids.add(user_id)
    return member_ids


def _commit_bug(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bug could not be saved because a related record conflicts.",
        ) from error


def _get_visible_bug(db: Session, bug_id: str, user: User) -> Bug:
    bug = db.scalar(_visible_bugs_query(user).where(Bug.id == bug_id))
    if bug is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bug not found.",
        )
    return bug


def _require_task_qa(db: Session, bug: Bug, user: User) -> Task:
    task = db.get(Task, bug.task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bug is not linked to an existing task.",
        )
    if task.qa_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the QA Engineer assigned to the task may review its bug fixes.",
        )
    return task


@router.get("", response_model=list[BugResponse])
def list_bugs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BugResponse]:
    bugs = db.scalars(
        _visible_bugs_query(current_user).order_by(Bug.created_at.desc())
    ).all()
    return [_bug_response(bug) for bug in bugs]


@router.get("/{bug_id}", response_model=BugResponse)
def get_bug(
    bug_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BugResponse:
    return _bug_response(_get_visible_bug(db, bug_id, current_user))


@router.post(
    "",
    response_model=BugResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_bug(
    bug_data: BugCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(QA_ENGINEER)),
) -> BugResponse:
    task = db.get(Task, bug_data.task_id)
    if task is None or task.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    project = db.get(Project, bug_data.project_id)
    if project is None or project.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )
    if task.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Task does not belong to the supplied project.",
        )
    if task.qa_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the QA Engineer assigned to the task may report a bug.",
        )
    if task.status not in BUG_REPORTABLE_TASK_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bugs may be reported while a task is in review or testing.",
        )
    if task.assignee_id is not None:
        assignee = db.get(User, task.assignee_id)
        if assignee is None or DEVELOPER not in assignee.assigned_roles:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="The task must be assigned to a valid Developer before reporting a bug.",
            )

    now = datetime.now(timezone.utc)
    bug = Bug(
        id=f"bug-{uuid4().hex}",
        title=bug_data.title,
        description=bug_data.description,
        project_id=project.id,
        task_id=task.id,
        severity=bug_data.severity,
        status="open",
        reported_by=current_user.id,
        assigned_to=task.assignee_id,
        verified_by=None,
        created_at=now,
        updated_at=now,
    )
    task.status = "in_progress"
    task.progress = min(task.progress, 90)
    task.updated_at = now
    db.add(bug)
    _record_activity(
        db,
        current_user.id,
        project.id,
        f"reported {bug.severity} severity bug “{bug.title}”.",
        now,
    )
    recipients = _bug_project_members(db, project.id)
    if bug.assigned_to is not None:
        recipients.add(bug.assigned_to)
    _notify_users(
        db,
        recipients,
        current_user.id,
        "Bug reported",
        bug.title,
        now,
        exclude_actor=False,
    )
    _commit_bug(db)
    db.refresh(bug)
    return _bug_response(bug)


@router.put("/{bug_id}", response_model=BugResponse)
def update_bug(
    bug_id: str,
    bug_data: BugUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BugResponse:
    bug = _get_visible_bug(db, bug_id, current_user)
    target_status = bug_data.status

    if current_user.active_role == DEVELOPER:
        if bug.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the Developer assigned to the bug may submit its fix.",
            )
        if bug.status not in BUG_FIXABLE_STATUSES or target_status != "fixed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only open, in-progress, or reopened bugs can be submitted as fixed.",
            )
    elif current_user.active_role == QA_ENGINEER:
        _require_task_qa(db, bug, current_user)
        if bug.status != "fixed" or target_status not in {"verified", "reopened"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="QA may verify or reject only a Developer-submitted fix.",
            )
        bug.verified_by = current_user.id if target_status == "verified" else None
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot update bugs.",
        )

    bug.status = target_status
    now = datetime.now(timezone.utc)
    bug.updated_at = now
    description = f"updated bug “{bug.title}” to {target_status.replace('_', ' ')}."
    _record_activity(db, current_user.id, bug.project_id, description, now)
    _notify_users(
        db,
        {user_id for user_id in (bug.assigned_to, bug.reported_by) if user_id},
        current_user.id,
        "Bug status updated",
        bug.title,
        now,
    )
    _commit_bug(db)
    db.refresh(bug)
    return _bug_response(bug)


@router.delete("/{bug_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bug(
    bug_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    bug = db.get(Bug, bug_id)
    if bug is None or bug.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bug not found.",
        )

    project = db.get(Project, bug.project_id)
    task = db.get(Task, bug.task_id)
    if (
        project is None
        or project.deleted_at is not None
        or task is None
        or task.deleted_at is not None
        or task.project_id != project.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bug not found.",
        )

    if current_user.active_role != SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot delete this resource.",
        )

    now = datetime.now(timezone.utc)
    result = db.execute(
        update(Bug)
        .where(Bug.id == bug_id, Bug.deleted_at.is_(None))
        .values(deleted_at=now, updated_at=now)
    )
    if result.rowcount != 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bug not found.",
        )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

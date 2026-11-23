import re
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import exists, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from auth import get_current_user, require_roles
from database import get_db
from models import Activity, Notification, Project, ProjectTeamLeader, Task, User
from schemas import ProjectCreate, ProjectResponse, ProjectUpdate


router = APIRouter()
PROJECT_LEAD = "PROJECT_LEAD"
TEAM_LEADER = "TEAM_LEADER"
SUPER_ADMIN = "SUPER_ADMIN"
EDITABLE_PROJECT_FIELDS = {
    "name",
    "description",
    "lead_id",
    "priority",
    "start_date",
    "end_date",
    "status",
}


def _visible_projects_query(user: User):
    query = (
        select(Project)
        .options(selectinload(Project.team_leader_assignments))
        .where(Project.deleted_at.is_(None))
    )
    if user.active_role == SUPER_ADMIN:
        return query
    if user.active_role == PROJECT_LEAD:
        return query.where(Project.lead_id == user.id)
    if user.active_role == TEAM_LEADER:
        assigned_to_user = exists(
            select(ProjectTeamLeader.project_id).where(
                ProjectTeamLeader.project_id == Project.id,
                ProjectTeamLeader.team_leader_id == user.id,
            )
        )
        return query.where(assigned_to_user)
    if user.active_role in {"DEVELOPER", "QA_ENGINEER"}:
        assigned_task = exists(
            select(Task.id).where(
                Task.project_id == Project.id,
                Task.deleted_at.is_(None),
                or_(Task.assignee_id == user.id, Task.qa_id == user.id),
            )
        )
        return query.where(assigned_task)
    return query.where(Project.id == "")


def _project_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        code=project.code,
        description=project.description,
        status=project.status,
        priority=project.priority,
        startDate=project.start_date,
        endDate=project.end_date,
        leadId=project.lead_id,
        teamLeaderIds=[
            assignment.team_leader_id
            for assignment in project.team_leader_assignments
        ],
        createdBy=project.created_by,
        createdAt=project.created_at,
        updatedAt=project.updated_at,
    )


def _require_project_lead(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Project Lead '{user_id}' does not exist.",
        )
    if PROJECT_LEAD not in user.assigned_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"User '{user_id}' must have the PROJECT_LEAD role.",
        )
    return user


def _require_team_leaders(db: Session, team_leader_ids: list[str]) -> None:
    if not team_leader_ids:
        return
    users = db.scalars(select(User).where(User.id.in_(team_leader_ids))).all()
    users_by_id = {user.id: user for user in users}
    for user_id in team_leader_ids:
        user = users_by_id.get(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Team Leader '{user_id}' does not exist.",
            )
        if TEAM_LEADER not in user.assigned_roles:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"User '{user_id}' must have the TEAM_LEADER role.",
            )


def _generated_project_code(name: str) -> str:
    prefix = re.sub(r"[^a-z0-9]", "", name, flags=re.IGNORECASE)[:6].upper()
    suffix = str(int(datetime.now(timezone.utc).timestamp() * 1000))[-4:]
    return f"{prefix or 'PROJECT'}-{suffix}"


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


def _notify_project_users(
    db: Session,
    user_ids: set[str],
    project: Project,
    actor_id: str,
    now: datetime,
) -> None:
    for user_id in user_ids - {actor_id}:
        db.add(
            Notification(
                id=f"ntf-{uuid4().hex}",
                user_id=user_id,
                type="project",
                title="Project updated",
                message=f"{project.name} was updated.",
                link="/projects",
                read=False,
                created_at=now,
            )
        )


def _commit_project(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project code already exists.",
        ) from error


@router.get("", response_model=list[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectResponse]:
    projects = db.scalars(
        _visible_projects_query(current_user).order_by(Project.created_at.desc())
    ).all()
    return [_project_response(project) for project in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    project = db.scalar(
        _visible_projects_query(current_user).where(Project.id == project_id)
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )
    return _project_response(project)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN)),
) -> ProjectResponse:
    lead = _require_project_lead(db, project_data.lead_id)
    now = datetime.now(timezone.utc)
    project = Project(
        id=f"prj-{uuid4().hex}",
        name=project_data.name,
        code=project_data.code or _generated_project_code(project_data.name),
        description=project_data.description,
        status="planning",
        priority=project_data.priority,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        lead_id=lead.id,
        created_by=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(project)
    db.add(
        Activity(
            id=f"act-{uuid4().hex}",
            actor_id=current_user.id,
            project=project,
            description=f"created project “{project.name}”.",
            timestamp=now,
            created_at=now,
            order=0,
        )
    )
    db.add(
        Notification(
            id=f"ntf-{uuid4().hex}",
            user_id=lead.id,
            type="project",
            title="Project assigned",
            message=project.name,
            link="/projects",
            read=False,
            created_at=now,
        )
    )
    _commit_project(db)
    db.refresh(project)
    return _project_response(project)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    updates = project_data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="At least one project field must be provided.",
        )

    project = db.scalar(
        _visible_projects_query(current_user).where(Project.id == project_id)
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if current_user.active_role == PROJECT_LEAD:
        if set(updates) != {"team_leader_ids"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project Leads may only assign Team Leaders to their projects.",
            )
        team_leader_ids = updates["team_leader_ids"]
        _require_team_leaders(db, team_leader_ids)
        existing_assignments = list(project.team_leader_assignments)
        existing_ids = {
            assignment.team_leader_id for assignment in existing_assignments
        }
        requested_ids = set(team_leader_ids)
        for assignment in existing_assignments:
            if assignment.team_leader_id not in requested_ids:
                project.team_leader_assignments.remove(assignment)
        for team_leader_id in team_leader_ids:
            if team_leader_id in existing_ids:
                continue
            db.add(
                ProjectTeamLeader(
                    project_id=project.id,
                    team_leader_id=team_leader_id,
                )
            )
        description = f"assigned Team Leaders to “{project.name}”."
    elif current_user.active_role == SUPER_ADMIN:
        if "team_leader_ids" in updates:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admins cannot assign Team Leaders through this operation.",
            )
        if not set(updates).issubset(EDITABLE_PROJECT_FIELDS):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="One or more project fields cannot be updated.",
            )
        if "lead_id" in updates:
            _require_project_lead(db, updates["lead_id"])
        merged_start = updates.get("start_date", project.start_date)
        merged_end = updates.get("end_date", project.end_date)
        if merged_start is not None and merged_end is not None and merged_end < merged_start:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="endDate must be on or after startDate.",
            )
        for field_name, value in updates.items():
            setattr(project, field_name, value)
        description = f"updated project “{project.name}”."
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot update projects.",
        )

    now = datetime.now(timezone.utc)
    project.updated_at = now
    _record_activity(db, current_user.id, project.id, description, now)

    member_ids = {project.lead_id}
    member_ids.update(
        assignment.team_leader_id for assignment in project.team_leader_assignments
    )
    task_users = db.scalars(
        select(Task.assignee_id).where(
            Task.project_id == project.id,
            Task.assignee_id.is_not(None),
        )
    ).all()
    qa_users = db.scalars(
        select(Task.qa_id).where(
            Task.project_id == project.id,
            Task.qa_id.is_not(None),
        )
    ).all()
    member_ids.update(task_users)
    member_ids.update(qa_users)
    _notify_project_users(db, member_ids, project, current_user.id, now)

    _commit_project(db)
    db.refresh(project)
    return _project_response(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    project = db.get(Project, project_id)
    if project is None or project.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if current_user.active_role != SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot delete this resource.",
        )

    now = datetime.now(timezone.utc)
    result = db.execute(
        update(Project)
        .where(Project.id == project_id, Project.deleted_at.is_(None))
        .values(deleted_at=now, updated_at=now)
    )
    if result.rowcount != 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

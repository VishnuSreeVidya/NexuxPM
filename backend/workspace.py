from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import exists, func, or_, select, update
from sqlalchemy.orm import Session, selectinload

from auth import get_current_user
from database import get_db
from models import (
    Activity,
    Notification,
    Project,
    ProjectTeamLeader,
    User,
    UserRoleAssignment,
)
from schemas import (
    ActivityResponse,
    AssignableUserResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
    UserRole,
)


router = APIRouter()

SUPER_ADMIN = "SUPER_ADMIN"
PROJECT_LEAD = "PROJECT_LEAD"
TEAM_LEADER = "TEAM_LEADER"
DEVELOPER = "DEVELOPER"
QA_ENGINEER = "QA_ENGINEER"


def _visible_activities_query(user: User):
    query = select(Activity).options(
        selectinload(Activity.actor),
        selectinload(Activity.project),
    )
    if user.active_role == SUPER_ADMIN:
        return query
    if user.active_role == PROJECT_LEAD:
        project_activity = exists(
            select(Project.id).where(
                Project.id == Activity.project_id,
                Project.lead_id == user.id,
            )
        )
        return query.where(or_(Activity.actor_id == user.id, project_activity))
    if user.active_role == TEAM_LEADER:
        project_activity = exists(
            select(ProjectTeamLeader.project_id).where(
                ProjectTeamLeader.project_id == Activity.project_id,
                ProjectTeamLeader.team_leader_id == user.id,
            )
        )
        return query.where(or_(Activity.actor_id == user.id, project_activity))
    return query.where(Activity.actor_id == user.id)


@router.get("/activity", response_model=list[ActivityResponse])
def list_activity(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ActivityResponse]:
    activities = db.scalars(
        _visible_activities_query(current_user)
        .order_by(Activity.timestamp.desc(), Activity.order.desc(), Activity.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [
        ActivityResponse(
            id=activity.id,
            actorId=activity.actor_id,
            actorName=activity.actor.name,
            actorAvatarColor=activity.actor.avatar_color,
            projectId=activity.project_id,
            projectName=activity.project.name if activity.project else None,
            description=activity.description,
            timestamp=activity.timestamp,
        )
        for activity in activities
    ]


@router.get("/notifications", response_model=list[NotificationResponse])
def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationResponse]:
    notifications = db.scalars(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return notifications


@router.get(
    "/notifications/unread-count",
    response_model=NotificationUnreadCountResponse,
)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationUnreadCountResponse:
    count = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == current_user.id, Notification.read.is_(False))
    )
    return NotificationUnreadCountResponse(unreadCount=count or 0)


@router.put(
    "/notifications/read-all",
    response_model=list[NotificationResponse],
)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationResponse]:
    db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read.is_(False))
        .values(read=True)
    )
    db.commit()
    notifications = db.scalars(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(100)
    ).all()
    return notifications


@router.put(
    "/notifications/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    notification.read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/users", response_model=list[AssignableUserResponse])
def list_assignable_users(
    role: UserRole,
    project_id: str | None = Query(default=None, alias="projectId", min_length=1, max_length=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AssignableUserResponse]:
    active_role = current_user.active_role
    if active_role == SUPER_ADMIN and role == PROJECT_LEAD and project_id is None:
        pass
    elif active_role == PROJECT_LEAD and role == TEAM_LEADER and project_id:
        project = db.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.lead_id == current_user.id,
            )
        )
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )
    elif active_role == TEAM_LEADER and role in {DEVELOPER, QA_ENGINEER} and project_id:
        assignment = db.scalar(
            select(ProjectTeamLeader.project_id).where(
                ProjectTeamLeader.project_id == project_id,
                ProjectTeamLeader.team_leader_id == current_user.id,
            )
        )
        if assignment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot retrieve users for this assignment.",
        )

    users = db.scalars(
        select(User)
        .join(UserRoleAssignment)
        .options(selectinload(User.role_assignments))
        .where(UserRoleAssignment.role == role)
        .order_by(User.name, User.id)
    ).unique().all()
    return [
        AssignableUserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            roles=sorted(user.assigned_roles),
        )
        for user in users
    ]

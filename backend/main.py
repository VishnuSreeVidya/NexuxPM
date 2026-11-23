from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from bugs import router as bugs_router
from database import settings
from profile_photos import auth_router as profile_photo_auth_router
from profile_photos import user_router as profile_photo_user_router
from projects import router as projects_router
from tasks import router as tasks_router
from workspace import router as workspace_router

app = FastAPI(
    title="Project Management Tool API",
    description="Backend API for our Project Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.frontend_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(projects_router, prefix="/projects", tags=["projects"])
app.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
app.include_router(bugs_router, prefix="/bugs", tags=["bugs"])
app.include_router(workspace_router, tags=["workspace"])
app.include_router(profile_photo_auth_router, prefix="/auth", tags=["profile-photos"])
app.include_router(profile_photo_user_router, tags=["profile-photos"])


@app.get("/")
def home():
    return {
        "message": "Project Management Tool API is running!",
        "status": "success"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FastAPI Backend"
    }
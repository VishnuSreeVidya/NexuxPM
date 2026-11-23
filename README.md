# NexuxPM – Project Management System

A full-stack, role-based Project Management System designed to help organizations manage projects, teams, tasks, milestones, bugs, and overall project progress through a centralized platform.

## Overview

NexuxPM provides dedicated workspaces for different organizational roles. It supports centralized project administration, team collaboration, task tracking, bug management, notifications, and project monitoring.

## Key Features

- JWT-based authentication and authorization
- Five role-based workspaces
- Multiple-role switching without logging out
- Project and team management
- Task assignment and progress tracking
- Sprint and milestone management
- Bug reporting, verification, and tracking
- Task comments and activity history
- Notifications
- Reports and project monitoring
- Profile photo upload and management
- PostgreSQL database integration
- Private S3-compatible object storage for profile photos

## Role-Based Workspaces

| Role | Responsibilities |
|---|---|
| Super Admin | Company-level management, project creation, and Project Lead assignment |
| Project Lead | Project portfolio, milestones, risks, and performance monitoring |
| Team Leader | Team workload, task assignment, progress tracking, and reviews |
| Developer | Assigned tasks, sprint work, deadlines, and blockers |
| QA Engineer | Test activities, bug reporting, verification, and retesting |

## Technology Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS
- React Router
- Lucide React

**Backend**
- Python
- FastAPI
- SQLAlchemy
- JWT Authentication

**Database and Storage**
- PostgreSQL
- S3-compatible object storage

**Development and Testing**
- Git and GitHub
- Postman
- Pytest
- Docker

## Project Structure

```text
NexuxPM/
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── projects.py
│   ├── tasks.py
│   ├── bugs.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   └── tests/
├── src/
│   ├── components/
│   ├── pages/
│   └── ...
├── public/
├── postman/
├── README.md
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.13+
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/VishnuSreeVidya/NexuxPM.git
cd NexuxPM
```

### 2. Frontend Setup

```bash
npm install
npm run dev
```

### 3. Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```cmd
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the backend environment variables in a local `.env` file before starting the server.

Start the backend:

```bash
uvicorn main:app --reload
```

### 4. API Documentation

Once the backend is running, access the interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

## Environment Configuration

Configure your own local environment variables. Never commit actual credentials, passwords, JWT secrets, or storage access keys.

Example variable names:

```env
DATABASE_URL=your_database_connection
JWT_SECRET=your_secret_key
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
S3_ENDPOINT_URL=your_storage_endpoint
S3_BUCKET=nexuxpm-profile-photos
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_REGION=us-east-1
```

## Testing

Run backend tests using:

```bash
pytest
```

## Security

- Passwords and credentials must remain outside source control.
- Protected API endpoints use authentication and authorization.
- Profile photos are stored in private object storage.
- Role-based permissions restrict access to application operations.

## Future Enhancements

- Advanced analytics and reporting
- Enhanced dashboard visualizations
- Additional collaboration features
- Expanded project performance insights

## Author

**Vishnu Sree Vidya**

GitHub: [VishnuSreeVidya](https://github.com/VishnuSreeVidya)

---

**NexuxPM – Plan. Collaborate. Deliver.**

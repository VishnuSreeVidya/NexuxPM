# NexuxPM – Project Management System

A full-stack, role-based Project Management System designed to help organizations manage projects, teams, tasks, milestones, bugs, and overall project progress through a centralized platform.

- **Live frontend:** https://vishnusreevidya.github.io/NexuxPM/
- **Repository:** https://github.com/VishnuSreeVidya/NexuxPM
- **Author:** Vishnu Sree Vidya

## Project overview

NexuxPM provides dedicated workspaces for different organizational roles. It supports centralized project administration, team collaboration, task tracking, bug management, notifications, and project monitoring. The React frontend is deployed as a static site on GitHub Pages; the FastAPI service, PostgreSQL database, and S3-compatible object storage are separate hosted components.

Navigation, route guards, permissions, and record-scope filtering are applied in both the frontend and the API. The UI is responsive and caches shared workspace state locally while the API remains the source of truth for authenticated data.

## Key features

- JWT-based authentication and authorization, with multiple-role switching without logging out
- Five role-based workspaces with dedicated dashboards, statistics, charts, tables, workload, and activity views
- Project and team management, task assignment, progress tracking, and reviews
- Sprint/milestone views, task comments, and activity history
- Bug reporting, verification, and tracking, plus notifications and reports/project monitoring
- Profile photo upload and management with private S3-compatible object storage
- PostgreSQL persistence with additive, idempotent schema migrations
- Server-enforced role permissions and record-scoped API responses
- Automatic static-site deployment through the official GitHub Pages Actions workflow

## Five role-based workspaces

| Role | Workspace focus and responsibilities |
| --- | --- |
| Super Admin | Company-level management, project creation, portfolio oversight, and Project Lead assignment |
| Project Lead | Project portfolio, delivery health, milestones, risks, performance monitoring, and Team Leader assignment |
| Team Leader | Team workload, task assignment, progress tracking, and reviews |
| Developer | Assigned tasks, sprint work, deadlines, blockers, and defect fixes |
| QA Engineer | Test activities, bug reporting, verification, retesting, and fix validation |

Seeded demo accounts (password `demo123` for all) can be selected with one click on the login screen:

| Role | Demo account |
| --- | --- |
| Super Admin | `ayesha.khan@nexuspm.dev` |
| Project Lead | `sarah.mitchell@nexuspm.dev` |
| Team Leader | `daniel.okafor@nexuspm.dev` |
| Developer | `elena.petrova@nexuspm.dev` |
| QA Engineer | `aisha.rahman@nexuspm.dev` |

The delivery workflow is: Super Admin creates projects and assigns a Project Lead → Project Lead assigns Team Leaders → Team Leader distributes tasks → Developer implements tasks and submits fixes → QA verifies work and manages defects.

## Technology stack

**Frontend:** React 19, Vite 8, JavaScript, CSS, React Router 7 (hash-based routing), Lucide React, `localStorage` caching.

**Backend:** Python 3.13+, FastAPI, SQLAlchemy 2, Pydantic / pydantic-settings, psycopg 3, PyJWT, python-multipart.

**Database and storage:** PostgreSQL, private S3-compatible object storage (boto3), Pillow image processing.

**Development and testing:** Git and GitHub, GitHub Actions, npm, Postman collection/specs, Python `unittest`/TestClient suites (Pytest-compatible style), optional Docker-based hosting.

## Project architecture and folder structure

```text
NexuxPM/
├── .github/workflows/deploy-pages.yml   # Build + official Pages deployment
├── .env.example                         # Frontend environment placeholders
├── backend/
│   ├── .env.example                     # Backend environment placeholders
│   ├── main.py                          # FastAPI app, CORS, router registration
│   ├── database.py                      # Engine/session settings
│   ├── models.py, schemas.py            # ORM models and request/response schemas
│   ├── auth.py, security.py             # JWT auth, roles, password handling
│   ├── projects.py, tasks.py, bugs.py   # Domain APIs
│   ├── workspace.py                     # Activity, notifications, users, profile
│   ├── profile_photos.py,
│   │   profile_photo_storage.py         # Private object-storage photo endpoints
│   ├── init_db.py, seed_db.py,
│   │   migrate_*.py                     # Schema setup, seeding, additive migrations
│   └── test_*.py                        # unittest / TestClient suites
├── postman/                             # API collection, specs, environments, globals
├── public/                              # favicon and icon sprite
└── src/
    ├── components/                      # Common, layout, dashboard, project, task UI
    ├── context/                         # Data, Auth, Toast providers
    ├── hooks/, utils/, reducers/        # Shared logic, permissions, selectors
    ├── data/, services/                 # Seed data, API client, localStorage
    ├── pages/                           # Login, five dashboards, workspace pages
    ├── routes/                          # Route tree, guards, role-filtered navigation
    └── styles/                          # CSS split by concern
```

Request flow: React components → context actions → `src/services/api.js` → FastAPI routers → SQLAlchemy/PostgreSQL and S3-compatible storage. `AuthContext` owns the verified session, `DataContext` owns cached workspace data, and `ToastContext` surfaces feedback.

## Frontend setup

Requires Node.js 22 (or another Node version supported by Vite 8).

```bash
git clone https://github.com/VishnuSreeVidya/NexuxPM.git
cd NexuxPM
npm ci
cp .env.example .env.local          # then replace the placeholder API URL
npm run dev                         # http://localhost:5173/NexuxPM/
```

For a local API, set `.env.local` to `VITE_API_BASE_URL=http://127.0.0.1:8000`. Leave it unset in production builds unless a public API is hosted. The frontend uses a localhost fallback **only in development**; the deployed bundle never hardcodes localhost.

```bash
npm run build                       # outputs dist/
npm run preview
npm run lint
```

Vite's base path is `/NexuxPM/`, so production assets resolve under `/NexuxPM/assets/`. Routing uses `HashRouter` because GitHub Pages has no server-side SPA fallback: deep links look like `https://vishnusreevidya.github.io/NexuxPM/#/dashboard`. All existing routes and role workspaces are preserved.

## Backend setup

The API is **not** hosted on GitHub Pages. Host FastAPI, PostgreSQL, and object storage on a platform that supports long-running processes and persistent data (for example Docker containers plus managed PostgreSQL and S3-compatible storage).

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install "fastapi>=0.115,<1" "uvicorn>=0.30,<1" "sqlalchemy>=2,<3" \
  "pydantic>=2,<3" "pydantic-settings>=2,<3" "psycopg[binary]>=3,<4" \
  "PyJWT>=2.10,<3" "python-multipart>=0.0.20,<1" "boto3>=1.44,<2" \
  "Pillow>=11,<13" "httpx>=0.27,<1"
pip install -r requirements-auth.txt  # auth/storage extra pins
cp .env.example .env                  # then replace every placeholder
python init_db.py
python seed_db.py                     # optional: load the five demo roles
uvicorn main:app --reload --port 8000
```

Existing databases can use the idempotent additive migrations `migrate_user_roles.py`, `migrate_profile_image_key.py`, and `migrate_soft_delete.py`. They preserve existing rows. Set `FRONTEND_ORIGINS` in the backend environment to include `https://vishnusreevidya.github.io` so browser requests from Pages are allowed by CORS.

## Environment configuration

Placeholders only — never commit real values, `.env`, `.env.local`, or `backend/.env`.

Frontend `.env.example` / `.env.local`:

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

Backend `backend/.env.example` / `backend/.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_ORIGINS=http://localhost:5173,https://vishnusreevidya.github.io
S3_ENDPOINT_URL=https://s3.example.com
S3_BUCKET=REPLACE_WITH_BUCKET_NAME
S3_ACCESS_KEY_ID=REPLACE_WITH_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY=REPLACE_WITH_SECRET_ACCESS_KEY
S3_REGION=REPLACE_WITH_REGION
```

The GitHub Actions build reads the repository variable `VITE_API_BASE_URL` (Settings → Secrets and variables → Actions → Variables). If it is unset, the static site still builds but API-dependent actions require you to set it and redeploy.

## API documentation

With the backend running, open:

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`
- Health check: `GET /health`

| Area | Endpoints (abridged) |
| --- | --- |
| Authentication | `POST /auth/login`, `GET /auth/me`, `POST /auth/switch-role` |
| Profile photos | `POST|PUT|DELETE /auth/me/profile-photo`, `GET /users/{user_id}/profile-photo` |
| Projects | `GET|POST /projects`, `GET|PUT|DELETE /projects/{project_id}` |
| Tasks | `GET|POST /tasks`, `GET|PUT|DELETE /tasks/{task_id}`, `POST /tasks/{task_id}/transition`, `GET|POST /tasks/{task_id}/comments` |
| Bugs | `GET|POST /bugs`, `GET|PUT|DELETE /bugs/{bug_id}` |
| Workspace | `GET /activity`, `GET /notifications`, `PUT /notifications/{id}/read`, `PUT /notifications/read-all`, `GET /notifications/unread-count`, `GET /users` |

Authenticated endpoints expect `Authorization: Bearer <token>`. A ready-to-use Postman collection, API specs, and empty environment/globals files are in `postman/`.

## Testing

Frontend:

```bash
npm run lint
npm run build
```

Backend (from `backend/`, with the virtual environment activated and `.env` present):

```bash
python -m unittest discover -s . -p "test_*.py" -v
```

The suites use in-memory SQLite and mocked object storage for role/auth, profile-photo, workspace API, and migration behavior. `test_db.py` additionally checks the configured PostgreSQL connection.

## GitHub Pages deployment

1. In repository settings, choose **Pages → Build and deployment → Source: GitHub Actions**.
2. Add the repository variable `VITE_API_BASE_URL` pointing to your hosted API origin (optional until an API is hosted).
3. Push to `main` or run the **Deploy React app to GitHub Pages** workflow manually.
4. `.github/workflows/deploy-pages.yml` installs dependencies with `npm ci`, builds with `npm run build`, uploads `dist/`, and deploys it with the official Pages actions.
5. Open https://vishnusreevidya.github.io/NexuxPM/ — the app loads at `/NexuxPM/` and client routes use the `#/` prefix.

Only the static frontend is deployed. FastAPI, PostgreSQL, and object storage need separate hosting, and their URLs/credentials must never be placed in the frontend bundle.

## Security notes

- Keep `.env`, `.env.local`, `backend/.env`, credentials, JWT secrets, passwords, and private keys out of Git; `.gitignore` excludes them. Postman environment and globals files are intentionally empty.
- Use a strong random `JWT_SECRET` in the backend environment; never expose it to the frontend.
- Protected API endpoints use authentication and authorization; role-based permissions restrict application operations.
- Restrict `FRONTEND_ORIGINS` to trusted origins and serve the API over HTTPS in production.
- Profile-photo buckets stay private; images are returned only by authenticated endpoints with `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.
- Do not rely on client-side role checks alone; the API enforces roles and record scope.
- GitHub Actions uses least-privilege `contents: read`, `pages: write`, and `id-token: write` permissions.

## Future enhancements

- Advanced analytics, reporting, and exportable compliance reports
- Enhanced dashboard visualizations and Gantt-style milestone timelines
- Sprint planning, team capacity forecasting, and workload balancing
- Email/in-app notification preferences and digest delivery
- Additional collaboration features and expanded project performance insights
- Managed staging → production promotion and database backup automation

---

**Author:** Vishnu Sree Vidya · **GitHub:** [VishnuSreeVidya](https://github.com/VishnuSreeVidya)

**NexuxPM – Plan. Collaborate. Deliver.**

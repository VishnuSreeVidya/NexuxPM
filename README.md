# NexusPM — Role-Based Project Management Workspace

NexusPM is a role-based project management workspace built with React and Vite, backed by a FastAPI/PostgreSQL API. It models a five-role delivery workflow with server-enforced authentication and authorization. Shared workspace data is also cached in the browser with `localStorage`.

> **Profile photos:** employee images are stored in a private S3-compatible SILO bucket and are only served through authenticated API endpoints. Initials remain the fallback for employees without a photo.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. To check the production bundle:

```bash
npm run build
npm run preview
```

## Demo accounts

Every account uses the password **`demo123`**. The login screen also has five one-click demo role chips.

| Role | Account | Workspace focus |
| --- | --- | --- |
| Super Admin | `ayesha.khan@nexuspm.dev` | Portfolio oversight, project and Project Lead assignment |
| Project Lead | `sarah.mitchell@nexuspm.dev` | Delivery health across assigned projects |
| Team Leader | `daniel.okafor@nexuspm.dev` | Team workload and task execution |
| Developer | `elena.petrova@nexuspm.dev` | Personal task queue and deadlines |
| QA Engineer | `aisha.rahman@nexuspm.dev` | Verification queue, defects, and testing |

## Workflow and role boundaries

1. The **Super Admin** owns the project portfolio and assigns a Project Lead.
2. The **Project Lead** owns delivery for assigned projects and can assign Team Leaders.
3. The **Team Leader** manages task distribution for their team.
4. The **Developer** completes assigned implementation tasks.
5. **QA** verifies completed work and manages defects.

Role-specific navigation, route guards, permission checks, and record-scope filtering keep each dashboard focused on the current user. Developer and QA project visibility is derived from their assigned tasks.

## Phase 1 scope

Implemented:

- Five role dashboards with role-specific statistics, charts, tables, workload, and activity
- Shared Projects, Tasks, Activity, Notifications, Profile, and Settings views with role-aware access
- Filtering, search, project and task detail modals, notification read state, profile editing, and demo-data reset
- Responsive sidebar and topbar layouts
- Seeded demo dataset with relative dates

Not implemented yet:

- Project, task, bug, milestone, and user management forms
- Full workflow mutations such as assigning leads, moving tasks, and verifying fixes
- Phases 2–6 from the project plan

## Employee profile photos

Profile photo support is available to every role from **Profile → Profile photo**.

| Operation | Endpoint | Notes |
| --- | --- | --- |
| Upload | `POST /auth/me/profile-photo` | Fails with `409` when a photo already exists |
| Update | `PUT /auth/me/profile-photo` | Replaces the existing object and reference |
| Remove | `DELETE /auth/me/profile-photo` | Clears the reference and removes the object |
| Retrieve | `GET /users/{userId}/profile-photo` | Requires a valid bearer token |

- Accepted formats are JPEG, PNG, and WebP, validated from file content rather than the supplied MIME type or filename.
- Uploads are limited to 5 MB and are resized to at most 2048 px before storage.
- PostgreSQL stores only the generated object key in `users.profile_image_key`; the bucket itself remains private.
- The schema change is additive and idempotent: `python migrate_profile_image_key.py`. New databases also apply it through `init_db.py`.
- Storage configuration is read from `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_REGION` in `backend/.env`. Keep that file out of version control.

## Structure

```text
src/
  components/       Shared UI, layout, dashboard, project, and task components
  context/          Data, authentication, and toast providers
  hooks/            Context hooks and small reusable hooks
  pages/            Route pages, including the five dashboards
  reducers/         Local state updates
  routes/           Route tree, guards, and role-filtered navigation
  services/         Seed data and localStorage persistence
  styles/           Plain CSS split by concern
  utils/            Permissions, access rules, selectors, constants, and formatting
```

`DataContext` is the single source of truth. Pure selectors derive role-scoped projects, tasks, workload, progress, notifications, and activity. `AuthContext` stores the signed-in user, while `ToastContext` handles feedback messages.

## Data persistence

Demo state is stored under the `nexuspm:data:v1` localStorage key. **Settings → Reset demo data** restores the original seeded dataset.

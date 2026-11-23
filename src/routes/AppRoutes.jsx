import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { RequireAuth, RequirePermission } from './ProtectedRoute'
import { ROLES } from '../utils/constants'
import { PERMISSIONS } from '../utils/permissions'
import { LoginPage } from '../pages/auth/LoginPage'
import { RoleDashboardPage } from '../pages/dashboards/RoleDashboardPage'
import { ProjectsPage } from '../pages/projects/ProjectsPage'
import { TasksPage } from '../pages/tasks/TasksPage'
import { ActivityPage } from '../pages/activity/ActivityPage'
import { NotificationsPage } from '../pages/notifications/NotificationsPage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { UnauthorizedPage } from '../pages/errors/UnauthorizedPage'
import { NotFoundPage } from '../pages/errors/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<RoleDashboardPage />} />

        <Route
          path="projects"
          element={
            <RequirePermission
              permission={PERMISSIONS.PROJECT_VIEW}
              roles={[ROLES.SUPER_ADMIN, ROLES.PROJECT_LEAD, ROLES.TEAM_LEADER]}
            >
              <ProjectsPage />
            </RequirePermission>
          }
        />

        <Route
          path="tasks"
          element={
            <RequirePermission
              permission={PERMISSIONS.TASK_VIEW}
              roles={[
                ROLES.SUPER_ADMIN,
                ROLES.TEAM_LEADER,
                ROLES.DEVELOPER,
                ROLES.QA_ENGINEER,
              ]}
            >
              <TasksPage />
            </RequirePermission>
          }
        />

        <Route
          path="activity"
          element={
            <RequirePermission
              permission={PERMISSIONS.ACTIVITY_VIEW}
              roles={[ROLES.SUPER_ADMIN, ROLES.PROJECT_LEAD, ROLES.TEAM_LEADER]}
            >
              <ActivityPage />
            </RequirePermission>
          }
        />

        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes

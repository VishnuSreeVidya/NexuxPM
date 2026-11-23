import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../utils/constants'
import { SuperAdminDashboard } from './SuperAdminDashboard'
import { ProjectLeadDashboard } from './ProjectLeadDashboard'
import { TeamLeaderDashboard } from './TeamLeaderDashboard'
import { DeveloperDashboard } from './DeveloperDashboard'
import { QaDashboard } from './QaDashboard'

const DASHBOARDS = {
  [ROLES.SUPER_ADMIN]: SuperAdminDashboard,
  [ROLES.PROJECT_LEAD]: ProjectLeadDashboard,
  [ROLES.TEAM_LEADER]: TeamLeaderDashboard,
  [ROLES.DEVELOPER]: DeveloperDashboard,
  [ROLES.QA_ENGINEER]: QaDashboard,
}

export function RoleDashboardPage() {
  const { currentUser } = useAuth()
  const Dashboard = currentUser ? DASHBOARDS[currentUser.role] : null
  return Dashboard ? <Dashboard /> : null
}

export default RoleDashboardPage

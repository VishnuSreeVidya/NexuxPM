import { Navigate, useParams } from 'react-router-dom'
import { ROLES } from '../../data/dashboardData'
import { AdminDashboard } from './dashboards/AdminDashboard'
import { ProjectLeadDashboard } from './dashboards/ProjectLeadDashboard'
import { TeamLeaderDashboard } from './dashboards/TeamLeaderDashboard'
import { DeveloperDashboard } from './dashboards/DeveloperDashboard'
import { QaDashboard } from './dashboards/QaDashboard'

const DASHBOARDS = {
  'super-admin': AdminDashboard,
  'project-lead': ProjectLeadDashboard,
  'team-leader': TeamLeaderDashboard,
  developer: DeveloperDashboard,
  'qa-engineer': QaDashboard,
}

export function DashboardPage() {
  const { role } = useParams()
  const Dashboard = DASHBOARDS[role]
  const roleLabel = ROLES.find((item) => item.id === role)?.label

  if (!Dashboard) return <Navigate to="/dashboard/super-admin" replace />

  return <Dashboard roleLabel={roleLabel} />
}

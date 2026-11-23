import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { ROLES } from '../utils/constants'
import { can } from '../utils/permissions'

export function usePermission() {
  const { currentUser } = useAuth()

  return useMemo(
    () => ({
      user: currentUser,
      role: currentUser?.role ?? null,
      can: (permission) => can(currentUser, permission),
      canAny: (permissions = []) => permissions.some((permission) => can(currentUser, permission)),
      isSuperAdmin: currentUser?.role === ROLES.SUPER_ADMIN,
      isProjectLead: currentUser?.role === ROLES.PROJECT_LEAD,
      isTeamLeader: currentUser?.role === ROLES.TEAM_LEADER,
      isDeveloper: currentUser?.role === ROLES.DEVELOPER,
      isQA: currentUser?.role === ROLES.QA_ENGINEER,
    }),
    [currentUser],
  )
}

export default usePermission

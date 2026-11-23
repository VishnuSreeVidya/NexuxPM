import { useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useDebounce } from '../../hooks/useDebounce'
import { PageHeader } from '../../components/common/PageHeader'
import { FilterBar } from '../../components/common/FilterBar'
import { EmptyState } from '../../components/common/EmptyState'
import { ActivityFeed } from '../../components/dashboard/ActivityFeed'
import { getVisibleProjects } from '../../utils/selectors'
import { daysUntil, formatDate } from '../../utils/dateUtils'

function getDayLabel(timestamp) {
  const difference = daysUntil(timestamp)
  if (difference === 0) return 'Today'
  if (difference === -1) return 'Yesterday'
  return formatDate(timestamp, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function ActivityPage() {
  const { state, activityLoading, activityError } = useData()
  const { currentUser, reloadActivity } = useAuth()
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const debouncedSearch = useDebounce(search, 200)

  const activities = state.activities
  const projects = useMemo(
    () => getVisibleProjects(state, currentUser),
    [state, currentUser],
  )

  const filteredActivities = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return activities.filter((activity) => {
      if (projectFilter !== 'all' && activity.projectId !== projectFilter) return false
      if (!query) return true
      const actor = state.users.find((user) => user.id === activity.actorId)
      const project = state.projects.find((item) => item.id === activity.projectId)
      return [
        activity.description,
        activity.actorName ?? actor?.name ?? '',
        activity.projectName ?? project?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [activities, state.users, state.projects, debouncedSearch, projectFilter])

  useEffect(() => {
    reloadActivity()
  }, [reloadActivity])

  const groups = useMemo(() => {
    const ordered = []
    const map = new Map()
    filteredActivities.forEach((activity) => {
      const label = getDayLabel(activity.timestamp)
      if (!map.has(label)) {
        map.set(label, [])
        ordered.push(label)
      }
      map.get(label).push(activity)
    })
    return ordered.map((label) => ({ label, items: map.get(label) }))
  }, [filteredActivities])

  const hasActiveFilters = Boolean(search.trim()) || projectFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setProjectFilter('all')
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace · Audit trail"
        title="Activity log"
        description="A chronological record of project, task, QA, and reporting updates visible to your role."
        actions={
          <span className="badge badge--neutral">{filteredActivities.length} updates</span>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search activity, people, or projects…"
        filters={[
          {
            key: 'project',
            label: 'Project',
            value: projectFilter,
            onChange: setProjectFilter,
            options: [
              { value: 'all', label: 'All projects' },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ],
          },
        ]}
        resultCount={filteredActivities.length}
        resultLabel="updates"
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="panel dashboard-panel">
        <div className="panel__header">
          <div>
            <h2 className="panel__title">Delivery timeline</h2>
            <p className="panel__subtitle">
              Updates are grouped by the day they occurred.
            </p>
          </div>
          <History size={16} className="text-muted" aria-hidden="true" />
          <button type="button" className="btn btn--ghost btn--sm" onClick={reloadActivity} disabled={activityLoading}>
            {activityLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="panel__body">
          {activityError ? (
            <div className="alert alert--danger" role="alert">
              {activityError}{' '}
              <button type="button" className="btn btn--ghost btn--sm" onClick={reloadActivity}>Retry</button>
            </div>
          ) : activityLoading && !activities.length ? (
            <p className="form-hint" role="status">Loading activity…</p>
          ) : groups.length ? (
            groups.map((group) => (
              <div className="activity-day" key={group.label}>
                <span className="activity-day__label">{group.label}</span>
                <ActivityFeed
                  activities={group.items}
                  users={state.users}
                  projects={state.projects}
                />
              </div>
            ))
          ) : (
            <EmptyState
              icon={History}
              title="No activity found"
              description="Try a different project or clear the search filters."
            />
          )}
        </div>
      </section>
    </>
  )
}

export default ActivityPage

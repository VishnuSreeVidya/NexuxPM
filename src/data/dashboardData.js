export const ROLES = [
  { id: 'super-admin', label: 'Super Admin', name: 'Olivia Rhye', initials: 'OR', color: '#c4b5fd' },
  { id: 'project-lead', label: 'Project Lead', name: 'Marcus Chen', initials: 'MC', color: '#93c5fd' },
  { id: 'team-leader', label: 'Team Leader', name: 'Sofia Patel', initials: 'SP', color: '#f9a8d4' },
  { id: 'developer', label: 'Developer', name: 'Ethan Brooks', initials: 'EB', color: '#86efac' },
  { id: 'qa-engineer', label: 'QA Engineer', name: 'Ava Thompson', initials: 'AT', color: '#fcd34d' },
]

export const PROJECTS = [
  { name: 'Website redesign', client: 'Acme Inc.', progress: 72, status: 'On track', color: 'blue', team: ['MC', 'SP', 'EB'], due: 'Nov 28' },
  { name: 'Mobile banking app', client: 'Finova', progress: 48, status: 'At risk', color: 'purple', team: ['SP', 'EB', 'AT'], due: 'Dec 04' },
  { name: 'Analytics platform', client: 'Northstar', progress: 91, status: 'On track', color: 'green', team: ['MC', 'AT'], due: 'Nov 21' },
  { name: 'Customer portal', client: 'Brightside', progress: 26, status: 'On track', color: 'orange', team: ['SP', 'EB'], due: 'Dec 18' },
]

export const TASKS = [
  { title: 'Update onboarding flow', project: 'Website redesign', assignee: 'Ethan Brooks', initials: 'EB', color: '#86efac', priority: 'High', status: 'In progress', due: 'Today' },
  { title: 'Review payment integration', project: 'Mobile banking app', assignee: 'Ava Thompson', initials: 'AT', color: '#fcd34d', priority: 'Urgent', status: 'In review', due: 'Nov 8' },
  { title: 'Design system documentation', project: 'Analytics platform', assignee: 'Sofia Patel', initials: 'SP', color: '#f9a8d4', priority: 'Medium', status: 'To do', due: 'Nov 10' },
  { title: 'Add export to CSV', project: 'Customer portal', assignee: 'Ethan Brooks', initials: 'EB', color: '#86efac', priority: 'Low', status: 'Testing', due: 'Nov 13' },
]

export const ACTIVITIES = [
  { initials: 'MC', color: '#93c5fd', name: 'Marcus Chen', action: 'moved Website redesign to', detail: 'In progress', time: '12 min ago' },
  { initials: 'AT', color: '#fcd34d', name: 'Ava Thompson', action: 'approved', detail: 'Payment flow validation', time: '48 min ago' },
  { initials: 'EB', color: '#86efac', name: 'Ethan Brooks', action: 'completed', detail: 'Responsive navigation', time: '2 hours ago' },
]

export const MILESTONES = [
  { title: 'Discovery & planning', project: 'Website redesign', date: 'Nov 7', status: 'Complete' },
  { title: 'Design handoff', project: 'Analytics platform', date: 'Nov 10', status: 'In progress' },
  { title: 'Beta release', project: 'Mobile banking app', date: 'Nov 13', status: 'Upcoming' },
]

export const WEEKLY_ACTIVITY = [
  { day: 'Mon', value: 45 },
  { day: 'Tue', value: 68 },
  { day: 'Wed', value: 56 },
  { day: 'Thu', value: 86 },
  { day: 'Fri', value: 72 },
  { day: 'Sat', value: 31 },
  { day: 'Sun', value: 20 },
]

export const WORKLOAD = [
  { name: 'Sofia Patel', role: 'Team Leader', initials: 'SP', color: '#f9a8d4', tasks: 8, load: 80 },
  { name: 'Ethan Brooks', role: 'Developer', initials: 'EB', color: '#86efac', tasks: 6, load: 60 },
  { name: 'Ava Thompson', role: 'QA Engineer', initials: 'AT', color: '#fcd34d', tasks: 9, load: 90 },
]

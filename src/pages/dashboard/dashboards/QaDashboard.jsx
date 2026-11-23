import { Bug, CheckCircle2, CircleDashed, FlaskConical, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { StatCard } from '../../../components/common/StatCard'
import { TASKS } from '../../../data/dashboardData'
import { Panel, TaskList } from '../components/DashboardParts'

export function QaDashboard() {
  const queue = [TASKS[1], { ...TASKS[3], title: 'Validate CSV export across browsers', status: 'Testing', priority: 'High', due: 'Jun 21' }]
  return (
    <>
      <PageHeader eyebrow="QA ENGINEER" title="Testing workspace" description="Review submissions, track bugs, and verify fixes before release." actions={<span className="date-pill"><ShieldCheck size={15} /> Release 2.4 · Nov 20</span>} />
      <div className="stats-grid">
        <StatCard icon={FlaskConical} label="Testing queue" value="06" meta="2 new submissions" tone="blue" />
        <StatCard icon={CircleDashed} label="In testing" value="03" meta="Across 2 projects" tone="purple" />
        <StatCard icon={CheckCircle2} label="Approved" value="11" meta="This sprint" tone="green" />
        <StatCard icon={Bug} label="Open bugs" value="04" meta="1 critical · 3 normal" tone="orange" />
      </div>
      <div className="dashboard-grid dashboard-grid--overview">
        <Panel title="Testing queue" subtitle="Development submissions ready for QA" id="work" action={<span className="subtle-count">6 awaiting test</span>}>
          <TaskList tasks={queue} />
        </Panel>
        <Panel title="Bug verification" subtitle="Fixes ready for another pass" id="projects">
          <div className="bug-list"><div className="bug-row"><span className="bug-severity bug-severity--high" /><div><strong>Checkout total rounding issue</strong><span>Mobile banking app · Fix submitted by Ethan</span></div><span className="badge badge--orange">Verify fix</span></div><div className="bug-row"><span className="bug-severity bug-severity--medium" /><div><strong>Incorrect empty state on search</strong><span>Website redesign · Fix submitted by Sofia</span></div><span className="badge badge--blue">Retest</span></div></div>
        </Panel>
        <Panel title="Testing summary" subtitle="Sprint quality snapshot" id="reports">
          <div className="qa-summary"><div className="qa-summary__ring"><div><strong>94%</strong><span>pass rate</span></div></div><div className="qa-summary__stats"><div><span>Tests run</span><strong>128</strong></div><div><span>Passed</span><strong className="text-green">120</strong></div><div><span>Failed</span><strong className="text-orange">08</strong></div></div></div>
        </Panel>
        <Panel title="Recent test runs" subtitle="Latest validation activity">
          <div className="test-run"><span className="test-run__icon test-run__icon--green"><CheckCircle2 size={16} /></span><div><strong>Authentication flow</strong><span>Website redesign · 12 checks passed</span></div><time>10:42 AM</time></div>
          <div className="test-run"><span className="test-run__icon test-run__icon--orange"><Bug size={16} /></span><div><strong>Payment integration</strong><span>Mobile banking app · 1 bug found</span></div><time>Yesterday</time></div>
        </Panel>
      </div>
    </>
  )
}

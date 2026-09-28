import { Link } from 'wouter';
import { ArrowRight, BriefcaseBusiness, CalendarDays, UsersRound } from 'lucide-react';
import { useGetManagerTeam, useGetReports } from '@workspace/api-client-react';
import { Card, Empty, Heading, Person, State } from '../components/workspace-ui';

export function Team() {
  const query = useGetManagerTeam();

  return (
    <>
      <Heading
        overline="MANAGEMENT / TEAM"
        title="Your direct reports"
        subtitle="The people you support and work with every day."
      />
      <Card title="Team members" sub={query.data ? `${query.data.length} direct reports` : 'Your team'}>
        <State loading={query.isLoading} error={query.error} retry={() => query.refetch()}>
          {query.data?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Person</th><th>Role</th><th>Department</th><th></th></tr></thead>
                <tbody>
                  {query.data.map(person => (
                    <tr key={person.id}>
                      <td><Person item={person} /></td>
                      <td>{person.jobTitle}</td>
                      <td>{person.department}</td>
                      <td>
                        <Link className="text-link" href={`/employees/${person.id}`} data-testid={`link-team-member-${person.id}`}>
                          View <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No direct reports" text="People assigned to your team will appear here." icon={UsersRound} />
          )}
        </State>
      </Card>
    </>
  );
}

export function Reports() {
  const query = useGetReports();
  const report = query.data;
  const maximum = Math.max(1, ...Object.values(report?.departmentCounts || {}));

  return (
    <>
      <Heading
        overline="INSIGHTS / REPORTS"
        title="The organisation at a glance"
        subtitle="A current snapshot of the people and teams that make it work."
      />
      <State loading={query.isLoading} error={query.error} retry={() => query.refetch()}>
        {report && (
          <>
            <div className="stats">
              <div className="card stat feature">
                <UsersRound className="stat-icon" size={21} />
                <div className="label">Total employees</div>
                <div className="number">{report.employeeCount}</div>
                <div className="label">Across the organisation</div>
              </div>
              <div className="card stat">
                <CalendarDays className="stat-icon" size={21} />
                <div className="label">Pending leave</div>
                <div className="number">{report.pendingLeave}</div>
                <div className="label">Awaiting review</div>
              </div>
              <div className="card stat">
                <BriefcaseBusiness className="stat-icon" size={21} />
                <div className="label">Departments</div>
                <div className="number">{Object.keys(report.departmentCounts).length}</div>
                <div className="label">Active teams</div>
              </div>
            </div>
            <Card title="People by department" sub="How the organisation is distributed">
              <div className="card-pad">
                {Object.entries(report.departmentCounts).length
                  ? Object.entries(report.departmentCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, count]) => (
                        <div key={name} style={{ padding: '10px 0 17px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                            <span>{name}</span><span>{count} people</span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${count / maximum * 100}%` }} />
                          </div>
                        </div>
                      ))
                  : <Empty title="No departments yet" text="Department distribution will appear as employee records are added." icon={BriefcaseBusiness} />}
              </div>
            </Card>
          </>
        )}
      </State>
    </>
  );
}
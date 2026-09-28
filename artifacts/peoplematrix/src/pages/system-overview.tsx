import { Link } from 'wouter';
import { Activity, ArrowRight, Settings2, UserRoundCog } from 'lucide-react';
import { useListAudit, useListSettings, useListUsers } from '@workspace/api-client-react';
import { Badge, Card, Empty, Heading, State } from '../components/workspace-ui';
import { date } from '../lib/format';

export function SystemOverview() {
  const users = useListUsers();
  const settings = useListSettings();
  const audit = useListAudit();
  const loading = users.isLoading || settings.isLoading || audit.isLoading;
  const error = users.error || settings.error || audit.error;

  return (
    <>
      <Heading
        overline="SYSTEM / OVERVIEW"
        title="Your system workspace"
        subtitle="Access, configuration and recent activity in one place."
      />
      <State
        loading={loading}
        error={error}
        retry={() => { users.refetch(); settings.refetch(); audit.refetch(); }}
      >
        <div className="stats">
          <div className="card stat feature">
            <UserRoundCog className="stat-icon" size={21} />
            <div className="label">User accounts</div>
            <div className="number">{users.data?.length ?? 0}</div>
            <div className="label">{users.data?.filter(user => user.active).length ?? 0} active</div>
          </div>
          <div className="card stat">
            <Settings2 className="stat-icon" size={21} />
            <div className="label">System settings</div>
            <div className="number">{settings.data?.length ?? 0}</div>
            <div className="label">Configured values</div>
          </div>
          <div className="card stat">
            <Activity className="stat-icon" size={21} />
            <div className="label">Audit events</div>
            <div className="number">{audit.data?.length ?? 0}</div>
            <div className="label">Events returned in this view</div>
          </div>
        </div>
        <div className="grid-main">
          <Card
            title="Recent system activity"
            sub="The latest recorded events"
            action={<Link href="/audit" className="text-link" data-testid="link-all-audit">View audit trail <ArrowRight size={13} /></Link>}
          >
            {audit.data?.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Action</th><th>When</th><th>Status</th></tr></thead>
                  <tbody>
                    {audit.data.slice(-5).reverse().map(event => (
                      <tr key={event.id}>
                        <td><strong>{event.action}</strong><div style={{ color: '#8b9995', marginTop: 3 }}>{event.method} {event.endpoint}</div></td>
                        <td>{date(event.createdAt)}</td>
                        <td><Badge value={String(event.status)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No events recorded" text="System activity will appear here as it is recorded." icon={Activity} />
            )}
          </Card>
          <Card title="Administration" sub="Manage your system">
            <div style={{ padding: '10px 18px' }}>
              {[
                { href: '/admin/users', label: 'Manage user access', icon: UserRoundCog },
                { href: '/admin/settings', label: 'Review settings', icon: Settings2 },
                { href: '/audit', label: 'Explore audit trail', icon: Activity },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="system-quick-link"
                  data-testid={'link-system-' + item.href.replaceAll('/', '-').slice(1)}
                >
                  <item.icon size={17} color="#679399" />
                  {item.label}
                  <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </State>
    </>
  );
}
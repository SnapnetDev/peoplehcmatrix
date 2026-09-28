import { Activity } from 'lucide-react';
import { useListAudit } from '@workspace/api-client-react';
import { Badge, Card, Empty, Heading, State } from '../components/workspace-ui';
import { date } from '../lib/format';

export function Audit() {
  const query = useListAudit();

  return (
    <>
      <Heading
        overline="SYSTEM / AUDIT"
        title="Activity audit trail"
        subtitle="A chronological record of system events and access."
      />
      <Card title="Recent events" sub={query.data ? `${query.data.length} events` : 'System activity'}>
        <State loading={query.isLoading} error={query.error} retry={() => query.refetch()}>
          {query.data?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th><th>Action</th><th>Endpoint</th>
                    <th>User</th><th>IP address</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map(event => (
                    <tr key={event.id}>
                      <td>{date(event.createdAt)}</td>
                      <td>
                        <strong>{event.action}</strong>
                        <div style={{ color: '#879795' }}>{event.method}</div>
                      </td>
                      <td style={{ fontFamily: 'Space Mono', fontSize: 10 }}>{event.endpoint}</td>
                      <td>{event.userId ? `#${event.userId}` : 'System'}</td>
                      <td>{event.ip || '—'}</td>
                      <td><Badge value={String(event.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No events recorded" text="System activity will be listed here as it occurs." icon={Activity} />
          )}
        </State>
      </Card>
    </>
  );
}
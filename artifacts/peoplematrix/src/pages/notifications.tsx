import { Link } from 'wouter';
import { Bell, CalendarDays, ChevronRight, TrendingUp } from 'lucide-react';
import { useListLeave, useListPerformance } from '@workspace/api-client-react';
import type { Account } from '@workspace/api-client-react';
import { Empty, Heading, State } from '../components/workspace-ui';
import { canReview, date } from '../lib/format';

export function Notifications({ user }: { user: Account }) {
  const leave = useListLeave();
  const performance = useListPerformance();
  const notices = [
    ...(leave.data || [])
      .filter(record =>
        canReview(user.role)
          ? record.status.toUpperCase() === 'PENDING' && record.employeeId !== user.employeeId
          : record.employeeId === user.employeeId && record.status.toUpperCase() !== 'PENDING'
      )
      .map(record => ({
        id: `leave-${record.id}`,
        title: canReview(user.role)
          ? `${record.type} request awaiting review`
          : `${record.type} request ${record.status.toLowerCase()}`,
        detail: `${date(record.startsOn)} – ${date(record.endsOn)} · Employee #${record.employeeId}`,
        href: '/leave',
        icon: CalendarDays,
      })),
    ...(performance.data || [])
      .filter(record => record.employeeId === user.employeeId)
      .map(record => ({
        id: `performance-${record.id}`,
        title: `Performance review for ${record.period}`,
        detail: `Rated ${record.rating} / 5 · ${date(record.createdAt)}`,
        href: '/performance',
        icon: TrendingUp,
      })),
  ];

  return (
    <>
      <Heading overline="WORKSPACE / UPDATES" title="Notifications" subtitle="What matters, gathered in one place." />
      <State
        loading={leave.isLoading || performance.isLoading}
        error={leave.error || performance.error}
        retry={() => { leave.refetch(); performance.refetch(); }}
      >
        {notices.length ? (
          <div className="card card-pad">
            {notices.map(notice => (
              <Link key={notice.id} href={notice.href} className="notice" data-testid={`link-notice-${notice.id}`}>
                <span className="notice-icon"><notice.icon size={17} /></span>
                <span>
                  <strong>{notice.title}</strong>
                  <p>{notice.detail}</p>
                </span>
                <ChevronRight size={15} style={{ marginLeft: 'auto', color: '#839995' }} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card">
            <Empty title="All caught up" text="There are no new leave decisions or performance updates to show." icon={Bell} />
          </div>
        )}
      </State>
    </>
  );
}
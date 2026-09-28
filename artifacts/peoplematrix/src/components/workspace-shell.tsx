import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity, Bell, BriefcaseBusiness, CalendarDays, ChevronRight, FileText,
  LayoutDashboard, LogOut, Menu, Settings2, TrendingUp, UserRoundCog,
  UsersRound, Wallet,
} from 'lucide-react';
import type { Account, AccountRole } from '@workspace/api-client-react';
import { isHR, labelRole } from '../lib/format';
import { Avatar } from './workspace-ui';

const navigation: {
  group: string;
  items: {
    href: string;
    label: string;
    icon: typeof Activity;
    roles?: AccountRole[];
  }[];
}[] = [
  {
    group: 'WORKSPACE',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/employees', label: 'People directory', icon: UsersRound },
      { href: '/leave', label: 'Time off', icon: CalendarDays },
      { href: '/performance', label: 'Performance', icon: TrendingUp },
      { href: '/payroll', label: 'Payroll', icon: Wallet },
      { href: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      { href: '/team', label: 'My team', icon: BriefcaseBusiness, roles: ['MANAGER'] },
      { href: '/reports', label: 'Reports', icon: FileText, roles: ['HR_ADMIN'] },
    ],
  },
  {
    group: 'ADMINISTRATION',
    items: [
      { href: '/admin/users', label: 'User access', icon: UserRoundCog, roles: ['SYSTEM_ADMIN'] },
      { href: '/admin/settings', label: 'Settings', icon: Settings2, roles: ['SYSTEM_ADMIN'] },
      { href: '/audit', label: 'Audit trail', icon: Activity, roles: ['SYSTEM_ADMIN'] },
    ],
  },
];

export function Shell({ user, onLogout, loggingOut, logoutError, children }: {
  user: Account;
  onLogout: () => void;
  loggingOut: boolean;
  logoutError: string;
  children: ReactNode;
}) {
  const [location] = useLocation();
  const [menu, setMenu] = useState(false);
  const page = navigation.flatMap(group => group.items).find(item => item.href === location)?.label
    || (location.startsWith('/employees/') ? 'Employee profile' : 'Workspace');

  useEffect(() => setMenu(false), [location]);

  return (
    <div className="app">
      <div className={'mobile-overlay' + (menu ? ' open' : '')} onClick={() => setMenu(false)} />
      <aside className={'sidebar' + (menu ? ' open' : '')}>
        <Link href="/" className="brand" data-testid="link-home">
          <span className="brand-mark">P</span>
          <span>people<span>matrix</span></span>
        </Link>
        <nav aria-label="Main navigation">
          {navigation.map(group => {
            const visible = group.items.filter(item =>
              (!item.roles || item.roles.includes(user.role)) &&
              (isHR(user.role) || !!user.employeeId ||
                !['/leave', '/performance', '/payroll'].includes(item.href))
            );
            if (!visible.length) return null;
            return (
              <div key={group.group}>
                <div className="nav-label">{group.group}</div>
                {visible.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={'nav-link' + (location === item.href ? ' active' : '')}
                    data-testid={'link-' + item.label.toLowerCase().replaceAll(' ', '-')}
                  >
                    <item.icon size={17} strokeWidth={1.8} />
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-user">
            <Avatar name={user.email} dark />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {user.email}
              </div>
              <small>{labelRole(user.role)}</small>
            </div>
          </div>
          {logoutError && <div className="error-box">{logoutError}</div>}
          <button className="logout" onClick={onLogout} disabled={loggingOut} data-testid="button-logout">
            <LogOut size={15} />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="mobile-menu" onClick={() => setMenu(true)} aria-label="Open navigation" data-testid="button-menu">
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className="top-date">
              {new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <Link href="/notifications" aria-label="Notifications" data-testid="link-notifications-header">
              <Bell size={18} />
            </Link>
            <Avatar name={user.email} />
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="footer">PeopleMatrix Security Lab — Synthetic Data Only</footer>
      </div>
    </div>
  );
}
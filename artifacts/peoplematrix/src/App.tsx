import { useEffect, useState, type FormEvent } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleHelp, FileText, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, TrendingUp, UserRound, UserRoundCog, UsersRound, Wallet } from 'lucide-react';
import {
  useLogout, useGetMe, getGetMeQueryKey,
  useListEmployees, getListEmployeesQueryKey, useSearchEmployees, getSearchEmployeesQueryKey,
  useGetEmployee, getGetEmployeeQueryKey, useCreateEmployee, useUpdateEmployee,
  useGetEmployeePayroll, getGetEmployeePayrollQueryKey, useListPayroll, getListPayrollQueryKey,
  useListLeave, getListLeaveQueryKey, useCreateLeave, useUpdateLeave,
  useListPerformance, getListPerformanceQueryKey, useCreatePerformanceComment,
  useGetManagerTeam, getGetManagerTeamQueryKey, useGetReports, getGetReportsQueryKey,
  useListUsers, getListUsersQueryKey, useCreateUser, useUpdateUser,
  useListSettings, getListSettingsQueryKey, useUpdateSetting,
} from '@workspace/api-client-react';
import type { Account, EmployeeInput, EmployeeUpdate, LeaveRecord, UserInput, UserUpdate, Setting } from '@workspace/api-client-react';
import { client, invalidate, TOKEN_KEY } from './lib/session';
import { isHR, isManager, isAdmin, canReview, labelRole, date, money, errText } from './lib/format';
import { Avatar, Badge, Heading, Card, Empty, State, Modal, Field, FormActions, Person } from './components/workspace-ui';
import { Shell } from './components/workspace-shell';
import { LoginPage } from './pages/login';
import { Team, Reports } from './pages/management';
import { Notifications } from './pages/notifications';
import { Audit } from './pages/audit';
import { SystemOverview } from './pages/system-overview';
import './index.css';

function Dashboard({ user }: { user: Account }) {
  const leave = useListLeave(); const perf = useListPerformance(); const report = useGetReports({ query: { enabled: isHR(user.role), queryKey: getGetReportsQueryKey() } }); const team = useGetManagerTeam({ query: { enabled: isManager(user.role), queryKey: getGetManagerTeamQueryKey() } });
  const pending = leave.data?.filter(x => x.status.toUpperCase() === 'PENDING') || [];
  const mine = leave.data?.filter(x => x.employeeId === user.employeeId) || [];
  return <><Heading overline="YOUR WORKSPACE" title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}.` } subtitle={`Here's what needs your attention today · ${labelRole(user.role)}`} /><div className="stats"><div className="card stat feature"><CalendarDays className="stat-icon" size={21} /><div className="label">Time off to review</div><div className="number">{leave.isLoading ? '—' : canReview(user.role) ? pending.length : mine.filter(x => x.status === 'PENDING').length}</div><div className="label">{canReview(user.role) ? 'Pending decisions' : 'Your pending requests'}</div></div><div className="card stat"><UsersRound className="stat-icon" size={21} /><div className="label">{isHR(user.role) ? 'Organisation' : isManager(user.role) ? 'My team' : 'My profile'}</div><div className="number">{isHR(user.role) ? report.data?.employeeCount ?? '—' : isManager(user.role) ? team.data?.length ?? '—' : user.employeeId ? '01' : '—'}</div><div className="label">{isHR(user.role) ? 'People across teams' : isManager(user.role) ? 'Direct reports' : 'Employee record'}</div></div><div className="card stat"><TrendingUp className="stat-icon" size={21} /><div className="label">Performance</div><div className="number">{perf.isLoading ? '—' : perf.data?.length ?? 0}</div><div className="label">Visible review records</div></div></div><div className="grid-main"><Card title="Time off activity" sub="The latest requests in your workspace" action={<Link href="/leave" className="text-link" data-testid="link-all-leave">View all <ArrowRight size={13} /></Link>}><State loading={leave.isLoading} error={leave.error} retry={() => leave.refetch()}>{leave.data?.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Request</th><th>Dates</th><th>Status</th></tr></thead><tbody>{leave.data.slice(0, 5).map(r => <tr key={r.id}><td><strong>{r.type}</strong><div style={{ color: '#8b9995', marginTop: 3 }}>Employee #{r.employeeId}</div></td><td>{date(r.startsOn)} – {date(r.endsOn)}</td><td><Badge value={r.status} /></td></tr>)}</tbody></table></div> : <Empty title="No requests yet" text="Time off requests will appear here as they are submitted." icon={CalendarDays} />}</State></Card><div><Card title="Quick access" sub="Find what you need, faster"><div style={{ padding: '10px 18px' }}>{[{ href: '/employees', label: 'Browse people', icon: UsersRound }, { href: '/leave', label: 'Manage time off', icon: CalendarDays }, { href: '/performance', label: 'View performance', icon: TrendingUp }, ...(isHR(user.role) ? [{ href: '/reports', label: 'Organisation reports', icon: FileText }] : [])].map(x => <Link key={x.href} href={x.href} data-testid={'link-quick-' + x.href.slice(1)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 5px', borderBottom: '1px solid #edf0e9', color: '#36575d', fontSize: 12, fontWeight: 700 }}><x.icon size={17} color="#679399" />{x.label}<ChevronRight size={15} style={{ marginLeft: 'auto' }} /></Link>)}</div></Card><div style={{ marginTop: 18, borderRadius: 12, padding: 22, background: '#e9ede3', color: '#314e50' }}><ShieldCheck size={21} /><strong style={{ display: 'block', marginTop: 12, font: '800 14px Manrope' }}>A workspace built on trust</strong><p style={{ fontSize: 11, lineHeight: 1.7, marginBottom: 0 }}>Your view is tailored to your role. Sensitive records stay with the people authorised to see them.</p></div></div></div></>;
}
function EmployeeForm({ close }: { close: () => void }) {
  const create = useCreateEmployee(); const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const s = (k: string) => String(f.get(k) || ''); const data: EmployeeInput = { firstName: s('firstName'), lastName: s('lastName'), email: s('email'), phone: s('phone'), jobTitle: s('jobTitle'), department: s('department'), managerId: s('managerId') ? Number(s('managerId')) : null, employmentDate: s('employmentDate'), salary: s('salary'), bankName: s('bankName'), bankAccount: s('bankAccount'), syntheticNin: s('syntheticNin'), address: s('address'), emergencyContact: s('emergencyContact') }; try { await create.mutateAsync({ data }); invalidate(getListEmployeesQueryKey(), getGetReportsQueryKey(), getSearchEmployeesQueryKey()); close(); } catch (e) { setError(errText(e)); } };
  return (
    <Modal title="Add a person" close={close}>
      <form onSubmit={submit}>
        <p className="form-guidance">
          Use fictional data only. Work email must end in <strong>@peoplematrix.test</strong> or
          <strong> @example.invalid</strong>. Bank account must begin with
          <strong> TEST-ACCOUNT-</strong> and synthetic NIN with <strong>TEST-NIN-</strong>,
          each followed by digits.
        </p>
        <div className="form-grid">
          <Field label="First name" name="firstName" required />
          <Field label="Last name" name="lastName" required />
          <Field label="Work email" name="email" type="email" placeholder="name@peoplematrix.test" required />
          <Field label="Phone" name="phone" required />
          <Field label="Job title" name="jobTitle" required />
          <Field label="Department" name="department" required />
          <Field label="Manager ID (optional)" name="managerId" type="number" />
          <Field label="Employment date" name="employmentDate" type="date" required />
          <Field label="Salary (NGN)" name="salary" type="number" min={0} max={100000000} step="0.01" required />
          <Field label="Bank name" name="bankName" required />
          <Field label="Bank account" name="bankAccount" placeholder="TEST-ACCOUNT-12345" pattern="TEST-ACCOUNT-[0-9]+" required />
          <Field label="Synthetic NIN" name="syntheticNin" placeholder="TEST-NIN-12345" pattern="TEST-NIN-[0-9]+" required />
          <Field label="Address" name="address" required />
          <Field label="Emergency contact" name="emergencyContact" required />
        </div>
        {error && <div className="error-box">{error}</div>}
        <FormActions close={close} pending={create.isPending} label="Add employee" />
      </form>
    </Modal>
  );
}
function Employees({ user }: { user: Account }) {
  const [q, setQ] = useState(''); const [department, setDepartment] = useState(''); const [show, setShow] = useState(false);
  const list = useListEmployees({ q: q || undefined, department: department || undefined }); const search = useSearchEmployees({ department }, { query: { enabled: !!department && !q, queryKey: getSearchEmployeesQueryKey({ department }) } });
  const rows = department && !q ? search.data : list.data; const loading = department && !q ? search.isLoading : list.isLoading; const error = department && !q ? search.error : list.error;
  return (
    <>
      <Heading
        overline="PEOPLE / DIRECTORY"
        title="The people behind the work"
        subtitle="Find colleagues, teams and the details you need."
        action={isHR(user.role) && (
          <button className="btn primary" onClick={() => setShow(true)} data-testid="button-add-employee">
            <Plus size={15} /> Add employee
          </button>
        )}
      />
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={16} />
          <input className="search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or keyword" aria-label="Search employees" data-testid="input-search-employees" />
        </div>
        <div className="search-wrap" style={{ maxWidth: 230 }}>
          <SlidersHorizontal size={15} />
          <input className="search-input" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Filter department" aria-label="Filter department" data-testid="input-filter-department" />
        </div>
      </div>
      <Card title="Employee directory" sub={rows ? `${rows.length} ${rows.length === 1 ? 'person' : 'people'} found` : 'Search the organisation'}>
        <State loading={loading} error={error} retry={() => (department && !q ? search : list).refetch()}>
          {rows?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Employee</th><th>Role</th><th>Department</th><th></th></tr></thead>
                <tbody>
                  {rows.map(row => {
                    const canOpenProfile = isHR(user.role) ||
                      user.employeeId === row.id ||
                      (isManager(user.role) && !!user.employeeId && row.managerId === user.employeeId);
                    return (
                      <tr key={row.id} data-testid={`row-employee-${row.id}`}>
                        <td><Person item={row} /></td>
                        <td>{row.jobTitle}</td>
                        <td><Badge value={row.department} /></td>
                        <td>
                          {canOpenProfile && (
                            <Link className="text-link" href={`/employees/${row.id}`} data-testid={`link-employee-${row.id}`}>
                              View profile <ArrowRight size={13} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No people found" text="Try another name or department, or add the first employee to the directory." icon={UsersRound} />
          )}
        </State>
      </Card>
      {show && <EmployeeForm close={() => setShow(false)} />}
    </>
  );
}
function EmployeeProfilePage({ user }: { user: Account }) {
  const { id } = useParams<{ id: string }>(); const employeeId = Number(id); const valid = Number.isInteger(employeeId) && employeeId > 0; const profile = useGetEmployee(employeeId, { query: { enabled: valid, queryKey: getGetEmployeeQueryKey(employeeId) } }); const payroll = useGetEmployeePayroll(employeeId, { query: { enabled: valid && (isHR(user.role) || user.employeeId === employeeId), queryKey: getGetEmployeePayrollQueryKey(employeeId) } }); const update = useUpdateEmployee(); const [editing, setEditing] = useState(false); const [error, setError] = useState('');
  const save = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const s = (k: string) => String(f.get(k) || ''); const data: EmployeeUpdate = { phone: s('phone'), address: s('address'), emergencyContact: s('emergencyContact'), ...(isHR(user.role) ? { jobTitle: s('jobTitle'), department: s('department'), employmentStatus: s('employmentStatus'), managerId: s('managerId') ? Number(s('managerId')) : null } : {}) }; try { await update.mutateAsync({ id: employeeId, data }); invalidate(getGetEmployeeQueryKey(employeeId), getListEmployeesQueryKey(), getGetReportsQueryKey(), getGetManagerTeamQueryKey()); setEditing(false); } catch (e) { setError(errText(e)); } };
  if (!valid) return <Empty title="Profile not found" text="This employee link is not valid." icon={UserRound} />;
  const p = profile.data;
  return <><Heading overline="PEOPLE / PROFILE" title={p ? `${p.firstName} ${p.lastName}` : 'Employee profile'} subtitle="Employment details and contact information" action={p && (isHR(user.role) || user.employeeId === employeeId) && <button className="btn primary" onClick={() => setEditing(true)} data-testid="button-edit-employee">Edit profile</button>} /><State loading={profile.isLoading} error={profile.error} retry={() => profile.refetch()}>{p && <><div className="profile-hero"><Avatar name={`${p.firstName} ${p.lastName}`} /><div><h2>{p.firstName} {p.lastName}</h2><p>{p.jobTitle} · {p.department}</p></div><span style={{ marginLeft: 'auto' }}><Badge value={p.employmentStatus} /></span></div><div className="grid-main"><Card title="Profile details" sub="Current employee information"><div className="card-pad detail-grid">{[['Email', p.email], ['Phone', p.phone], ['Department', p.department], ['Job title', p.jobTitle], ['Employment date', date(p.employmentDate)], ['Manager ID', p.managerId ? `#${p.managerId}` : 'Not assigned'], ['Address', p.address], ['Emergency contact', p.emergencyContact]].map(([k,v]) => <div className="detail" key={k}><small>{k}</small><strong>{v || '—'}</strong></div>)}</div></Card><div><Card title="Time off balance" sub="Available leave days"><div className="card-pad"><div style={{ font: '800 42px Manrope', color: '#245d67' }}>{p.leaveBalance}</div><span style={{ color: '#788c89', fontSize: 12 }}>days available</span></div></Card>{(isHR(user.role) || user.employeeId === employeeId) && <div style={{ marginTop: 18 }}><Card title="Payroll history" sub="Payment records for this employee"><State loading={payroll.isLoading} error={payroll.error} retry={() => payroll.refetch()}>{payroll.data?.length ? <div className="table-wrap"><table className="table"><tbody>{payroll.data.slice(0, 4).map(r => <tr key={r.id}><td>{r.period}</td><td><strong>{money(r.net)}</strong></td></tr>)}</tbody></table></div> : <Empty title="No payroll records" text="Payment history will appear here when available." icon={Wallet} />}</State></Card></div>}</div></div></> }</State>{editing && p && <Modal title={`Edit ${p.firstName}'s profile`} close={() => setEditing(false)}><form onSubmit={save}><div className="form-grid"><Field label="Phone" name="phone" defaultValue={p.phone} /><Field label="Address" name="address" defaultValue={p.address} /><Field label="Emergency contact" name="emergencyContact" defaultValue={p.emergencyContact} />{isHR(user.role) && <><Field label="Job title" name="jobTitle" defaultValue={p.jobTitle} /><Field label="Department" name="department" defaultValue={p.department} /><Field label="Employment status" name="employmentStatus" defaultValue={p.employmentStatus} /><Field label="Manager ID" name="managerId" type="number" defaultValue={p.managerId ?? ''} /></>}</div>{error && <div className="error-box">{error}</div>}<FormActions close={() => setEditing(false)} pending={update.isPending} /></form></Modal>}</>;
}
function Payroll({ user }: { user: Account }) {
  const all = useListPayroll({ query: { enabled: isHR(user.role), queryKey: getListPayrollQueryKey() } }); const own = useGetEmployeePayroll(user.employeeId || 0, { query: { enabled: !isHR(user.role) && !!user.employeeId, queryKey: getGetEmployeePayrollQueryKey(user.employeeId || 0) } }); const rows = isHR(user.role) ? all.data : own.data; const query = isHR(user.role) ? all : own;
  return <><Heading overline="FINANCE / PAYROLL" title="Payroll records" subtitle={isHR(user.role) ? 'A clear view of payments across the organisation.' : 'A private view of your payment history.'} /><Card title="Payment history" sub={rows ? `${rows.length} records` : 'Recorded payments'}><State loading={query.isLoading} error={query.error} retry={() => query.refetch()}>{rows?.length ? <div className="table-wrap"><table className="table"><thead><tr>{isHR(user.role) && <th>Employee</th>}<th>Period</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Paid on</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}>{isHR(user.role) && <td><Link className="text-link" href={`/employees/${r.employeeId}`}>Employee #{r.employeeId}</Link></td>}<td><strong>{r.period}</strong></td><td>{money(r.gross)}</td><td>{money(r.deductions)}</td><td><strong>{money(r.net)}</strong></td><td>{date(r.paymentDate)}</td></tr>)}</tbody></table></div> : <Empty title="No payment records" text="Payroll history will be available here once payments are recorded." icon={Wallet} />}</State></Card></>;
}
function Leave({ user }: { user: Account }) {
  const query = useListLeave(); const create = useCreateLeave(); const decision = useUpdateLeave(); const [open, setOpen] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState<number | null>(null);
  const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { await create.mutateAsync({ data: { type: String(f.get('type')), startsOn: String(f.get('startsOn')), endsOn: String(f.get('endsOn')), reason: String(f.get('reason')) } }); invalidate(getListLeaveQueryKey(), getGetReportsQueryKey()); setOpen(false); setError(''); } catch (e) { setError(errText(e)); } };
  const review = async (r: LeaveRecord, status: 'APPROVED' | 'REJECTED') => { if (!window.confirm(`${status === 'APPROVED' ? 'Approve' : 'Reject'} this ${r.type} request?`)) return; setBusy(r.id); setError(''); try { await decision.mutateAsync({ id: r.id, data: { status } }); invalidate(getListLeaveQueryKey(), getGetReportsQueryKey(), getGetEmployeeQueryKey(r.employeeId)); } catch (e) { setError(errText(e)); } finally { setBusy(null); } };
  return (
    <>
      <Heading
        overline="PEOPLE / TIME OFF"
        title="Time off, made simple"
        subtitle={canReview(user.role) ? 'Review team requests and keep everyone in the loop.' : 'Request time away and follow its progress.'}
        action={user.employeeId && (
          <button className="btn primary" onClick={() => setOpen(true)} data-testid="button-request-leave">
            <Plus size={15} /> Request time off
          </button>
        )}
      />
      {!user.employeeId && (
        <div className="form-guidance" role="status">
          This account has no employee profile, so it cannot submit time off requests.
          {isHR(user.role) && ' You can still review organisation requests below.'}
        </div>
      )}
      {error && !open && <div className="error-box" role="alert">{error}</div>}
      <Card title="Leave requests" sub={query.data ? `${query.data.length} requests in view` : 'Request history'}>
        <State loading={query.isLoading} error={query.error} retry={() => query.refetch()}>
          {query.data?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Request</th><th>Dates</th><th>Reason</th><th>Status</th>{canReview(user.role) && <th>Review</th>}</tr></thead>
                <tbody>{query.data.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.type}</strong><div style={{ color: '#849592', marginTop: 4 }}>Employee #{r.employeeId}</div></td>
                    <td>{date(r.startsOn)}<br />{date(r.endsOn)}</td>
                    <td style={{ maxWidth: 240, whiteSpace: 'normal' }}>{r.reason}</td>
                    <td><Badge value={r.status} /></td>
                    {canReview(user.role) && (
                      <td>{r.status.toUpperCase() === 'PENDING' && r.employeeId !== user.employeeId ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn" disabled={busy === r.id} onClick={() => review(r, 'APPROVED')} data-testid={`button-approve-leave-${r.id}`}><Check size={13} /> Approve</button>
                          <button className="btn danger" disabled={busy === r.id} onClick={() => review(r, 'REJECTED')} data-testid={`button-reject-leave-${r.id}`}>Reject</button>
                        </div>
                      ) : '—'}</td>
                    )}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <Empty title="A clear calendar" text="There are no time off requests to show yet." icon={CalendarDays} />
          )}
        </State>
      </Card>
      {open && !!user.employeeId && (
        <Modal title="Request time off" close={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="Leave type" name="type" required>
                <select name="type" required data-testid="select-leave-type">
                  <option value="">Select a type</option><option value="Annual">Annual leave</option>
                  <option value="Sick">Sick leave</option><option value="Personal">Personal leave</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <div />
              <Field label="Starts on" name="startsOn" type="date" required />
              <Field label="Ends on" name="endsOn" type="date" required />
              <label className="field wide">Reason
                <textarea name="reason" required data-testid="input-leave-reason" placeholder="Add a little context for your reviewer" />
              </label>
            </div>
            {error && <div className="error-box">{error}</div>}
            <FormActions close={() => setOpen(false)} pending={create.isPending} label="Submit request" />
          </form>
        </Modal>
      )}
    </>
  );
}
function Performance({ user }: { user: Account }) {
  const query = useListPerformance();
  const employees = useListEmployees(undefined, {
    query: { enabled: isHR(user.role), queryKey: getListEmployeesQueryKey() },
  });
  const team = useGetManagerTeam({
    query: { enabled: isManager(user.role), queryKey: getGetManagerTeamQueryKey() },
  });
  const reviewTargets = isManager(user.role) ? team.data : employees.data;
  const targetError = isManager(user.role) ? team.error : employees.error;
  const targetsLoading = isManager(user.role) ? team.isLoading : employees.isLoading;
  const create = useCreatePerformanceComment();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { await create.mutateAsync({ data: { employeeId: Number(f.get('employeeId')), period: String(f.get('period')), rating: Number(f.get('rating')), comment: String(f.get('comment')) } }); invalidate(getListPerformanceQueryKey()); setOpen(false); setError(''); } catch (e) { setError(errText(e)); } };
  return <><Heading overline="GROWTH / PERFORMANCE" title="Progress, in perspective" subtitle="A record of feedback, recognition and growth over time." action={canReview(user.role) && <button className="btn primary" onClick={() => setOpen(true)} data-testid="button-add-performance"><Plus size={15} /> Add review</button>} /><State loading={query.isLoading} error={query.error} retry={() => query.refetch()}>{query.data?.length ? <div style={{ display: 'grid', gap: 13 }}>{query.data.map(r => <div className="card card-pad" key={r.id}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><div><div className="eyebrow">EMPLOYEE #{r.employeeId} · {r.period}</div><h2 className="card-title" style={{ marginTop: 8 }}>Performance review</h2></div><span className="badge">{r.rating} / 5</span></div><p style={{ fontSize: 13, color: '#40575a', lineHeight: 1.7, margin: '20px 0' }} dangerouslySetInnerHTML={{ __html: r.comment }} /><div style={{ borderTop: '1px solid #edf0e9', paddingTop: 12, fontSize: 11, color: '#82928e' }}>Reviewed by #{r.reviewerId} · {date(r.createdAt)}</div></div>)}</div> : <div className="card"><Empty title="No reviews in view" text="Performance records shared with you will be available here." icon={TrendingUp} /></div>}</State>{open && <Modal title="Add performance review" close={() => setOpen(false)}><form onSubmit={submit}><div className="form-grid"><Field label="Employee" name="employeeId" required><select name="employeeId" required data-testid="select-review-employee"><option value="">Select employee</option>{reviewTargets?.map(x => <option key={x.id} value={x.id}>{x.firstName} {x.lastName}</option>)}</select></Field><Field label="Review period" name="period" required /><Field label="Rating (1–5)" name="rating" type="number" min={1} max={5} required /><label className="field wide">Comment<textarea name="comment" required data-testid="input-performance-comment" placeholder="Share specific, constructive feedback" /></label></div>{isManager(user.role) && !targetsLoading && !targetError && !reviewTargets?.length && <div className="form-guidance">No direct reports are available for review.</div>}{targetError && <div className="error-box">{errText(targetError)}</div>}{error && <div className="error-box">{error}</div>}<FormActions close={() => setOpen(false)} pending={create.isPending || targetsLoading || !!targetError || !reviewTargets?.length} label="Save review" /></form></Modal>}</>;
}
function UsersAdmin() {
  const query = useListUsers(); const create = useCreateUser(); const update = useUpdateUser(); const [modal, setModal] = useState<Account | 'new' | null>(null); const [error, setError] = useState('');
  const save = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { if (modal === 'new') { const data: UserInput = { email: String(f.get('email')), password: String(f.get('password')), role: String(f.get('role')) as UserInput['role'], employeeId: f.get('employeeId') ? Number(f.get('employeeId')) : null }; await create.mutateAsync({ data }); } else if (modal) { const data: UserUpdate = { role: String(f.get('role')) as UserUpdate['role'], active: f.get('active') === 'on' }; if (f.get('password')) data.password = String(f.get('password')); await update.mutateAsync({ id: modal.id, data }); } invalidate(getListUsersQueryKey()); setModal(null); setError(''); } catch (e) { setError(errText(e)); } };
  return <><Heading overline="SYSTEM / ACCESS" title="User administration" subtitle="Manage workspace access and account roles." action={<button className="btn primary" onClick={() => setModal('new')} data-testid="button-add-user"><Plus size={15} /> Add user</button>} /><Card title="System users" sub={query.data ? `${query.data.length} accounts` : 'Account directory'}><State loading={query.isLoading} error={query.error} retry={() => query.refetch()}>{query.data?.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Account</th><th>Role</th><th>Employee</th><th>Status</th><th></th></tr></thead><tbody>{query.data.map(u => <tr key={u.id}><td><div className="person"><Avatar name={u.email} /><strong>{u.email}</strong></div></td><td>{labelRole(u.role)}</td><td>{u.employeeId ? `#${u.employeeId}` : '—'}</td><td><Badge value={u.active ? 'Active' : 'Inactive'} /></td><td><button className="btn" onClick={() => setModal(u)} data-testid={`button-edit-user-${u.id}`}>Manage</button></td></tr>)}</tbody></table></div> : <Empty title="No accounts" text="Create an account to provide workspace access." icon={UserRoundCog} />}</State></Card>{modal && <Modal title={modal === 'new' ? 'Create user account' : 'Manage user account'} close={() => setModal(null)}><form onSubmit={save}><div className="form-grid">{modal === 'new' && <><Field label="Work email" name="email" type="email" required /><Field label="Password (12+ characters)" name="password" type="password" required /><Field label="Employee ID (optional)" name="employeeId" type="number" /></>}{modal !== 'new' && <><div className="field wide">Account<strong>{modal.email}</strong></div><Field label="New password (leave blank to keep current)" name="password" type="password" /></>}<Field label="Role" name="role" required><select name="role" defaultValue={modal === 'new' ? 'EMPLOYEE' : modal.role} data-testid="select-user-role"><option value="EMPLOYEE">Employee</option><option value="MANAGER">Manager</option><option value="HR_ADMIN">HR administrator</option><option value="SYSTEM_ADMIN">System administrator</option></select></Field>{modal !== 'new' && <label className="field" style={{ flexDirection: 'row', alignItems: 'center' }}><input type="checkbox" name="active" defaultChecked={modal.active} style={{ width: 16 }} data-testid="checkbox-user-active" /> Account active</label>}</div>{error && <div className="error-box">{error}</div>}<FormActions close={() => setModal(null)} pending={create.isPending || update.isPending} label={modal === 'new' ? 'Create account' : 'Save account'} /></form></Modal>}</>;
}
function SettingsAdmin() {
  const query = useListSettings(); const update = useUpdateSetting(); const [selected, setSelected] = useState<Setting | null>(null); const [error, setError] = useState('');
  const save = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); try { await update.mutateAsync({ data: { key: selected!.key, value: String(new FormData(e.currentTarget).get('value')) } }); invalidate(getListSettingsQueryKey()); setSelected(null); setError(''); } catch (e) { setError(errText(e)); } };
  return <><Heading overline="SYSTEM / CONFIGURATION" title="Workspace settings" subtitle="Review and maintain organisation-wide configuration." /><Card title="Configuration" sub="Current system values"><State loading={query.isLoading} error={query.error} retry={() => query.refetch()}>{query.data?.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Setting</th><th>Value</th><th></th></tr></thead><tbody>{query.data.map(s => <tr key={s.key}><td><strong>{s.key}</strong></td><td>{s.value}</td><td><button className="btn" onClick={() => setSelected(s)} data-testid={`button-edit-setting-${s.key}`}>Edit</button></td></tr>)}</tbody></table></div> : <Empty title="No settings available" text="System settings will appear here when configured." icon={Settings2} />}</State></Card>{selected && <Modal title={`Edit ${selected.key}`} close={() => setSelected(null)}><form onSubmit={save}><Field label="Value" name="value" defaultValue={selected.value} required />{error && <div className="error-box">{error}</div>}<FormActions close={() => setSelected(null)} pending={update.isPending} /></form></Modal>}</>;
}
function Forbidden() { return <div className="card" style={{ maxWidth: 600, margin: '70px auto' }}><Empty title="This space isn't in your view" text="Your role does not include access to this area. If that seems incorrect, contact your workspace administrator." icon={ShieldCheck} /><div style={{ textAlign: 'center', paddingBottom: 30 }}><Link href="/" className="btn primary" data-testid="link-back-home">Back to overview</Link></div></div>; }
function NotFound() { return <div className="card" style={{ maxWidth: 600, margin: '70px auto' }}><Empty title="We couldn't find that page" text="The address may have changed. Head back to your workspace to keep going." icon={CircleHelp} /><div style={{ textAlign: 'center', paddingBottom: 30 }}><Link href="/" className="btn primary" data-testid="link-back-home">Back to overview</Link></div></div>; }
function Authenticated({ token, setToken }: { token: string; setToken: (v: string) => void }) {
  const me = useGetMe({ query: { enabled: !!token, queryKey: getGetMeQueryKey(), retry: false } });
  const [, navigate] = useLocation();
  const logout = useLogout();
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    if ((me.error as { status?: number } | null)?.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      client.clear();
      setToken('');
      navigate('/login');
    }
  }, [me.error, navigate, setToken]);

  const signout = async () => {
    setLogoutError('');
    try {
      await logout.mutateAsync();
      sessionStorage.removeItem(TOKEN_KEY);
      client.clear();
      setToken('');
      navigate('/login');
    } catch (error) {
      setLogoutError(`Could not sign out: ${errText(error)}. Please try again.`);
    }
  };

  if (me.isLoading) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <div className="card card-pad" style={{ width: 350 }}>
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </div>
  );
  if (me.error || !me.data) return (
    <div style={{ maxWidth: 470, margin: '15vh auto' }}>
      <State loading={false} error={me.error || new Error('Unable to verify your session.')} retry={() => me.refetch()}>{null}</State>
      <button
        className="btn"
        style={{ marginTop: 14 }}
        onClick={() => {
          sessionStorage.removeItem(TOKEN_KEY);
          client.clear();
          setToken('');
          navigate('/login');
        }}
        data-testid="button-return-login"
      >
        Return to sign in
      </button>
    </div>
  );
  const user = me.data;
  return (
    <Shell user={user} onLogout={signout} loggingOut={logout.isPending} logoutError={logoutError}>
      <Switch>
        <Route path="/">
          {isAdmin(user.role) && !user.employeeId ? <SystemOverview /> : <Dashboard user={user} />}
        </Route>
        <Route path="/employees"><Employees user={user} /></Route>
        <Route path="/employees/:id"><EmployeeProfilePage user={user} /></Route>
        <Route path="/payroll">
          {!user.employeeId && !isHR(user.role) ? <Forbidden /> : <Payroll user={user} />}
        </Route>
        <Route path="/leave">
          {!user.employeeId && !isHR(user.role) ? <Forbidden /> : <Leave user={user} />}
        </Route>
        <Route path="/performance">
          {!user.employeeId && !isHR(user.role) ? <Forbidden /> : <Performance user={user} />}
        </Route>
        <Route path="/team">{isManager(user.role) ? <Team /> : <Forbidden />}</Route>
        <Route path="/reports">{isHR(user.role) ? <Reports /> : <Forbidden />}</Route>
        <Route path="/admin/users">{isAdmin(user.role) ? <UsersAdmin /> : <Forbidden />}</Route>
        <Route path="/admin/settings">{isAdmin(user.role) ? <SettingsAdmin /> : <Forbidden />}</Route>
        <Route path="/audit">{isAdmin(user.role) ? <Audit /> : <Forbidden />}</Route>
        <Route path="/notifications"><Notifications user={user} /></Route>
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}
function Routes() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [location, navigate] = useLocation();
  useEffect(() => {
    if (token && location === '/login') navigate('/');
  }, [token, location, navigate]);
  const login = <LoginPage onLogin={nextToken => { setToken(nextToken); navigate('/'); }} />;
  return (
    <Switch>
      <Route path="/login">
        {token ? (
          <div className="card card-pad" style={{ maxWidth: 360, margin: '15vh auto' }}>
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : login}
      </Route>
      <Route>{token ? <Authenticated token={token} setToken={setToken} /> : login}</Route>
    </Switch>
  );
}
function App() {
  return (
    <QueryClientProvider client={client}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes />
      </WouterRouter>
    </QueryClientProvider>
  );
}
export default App;
import type { ReactNode } from 'react';
import { CircleHelp, ClipboardList, X } from 'lucide-react';
import type { EmployeeSummary } from '@workspace/api-client-react';
import { errText, initials } from '../lib/format';

export function Avatar({ name, dark = false }: { name: string; dark?: boolean }) {
  return <span className={'avatar' + (dark ? ' dark' : '')}>{initials(name)}</span>;
}

export function Badge({ value }: { value: string }) {
  return <span className={'badge ' + value.toLowerCase()}>{value.replaceAll('_', ' ').toLowerCase()}</span>;
}

export function Heading({ overline, title, subtitle, action }: {
  overline: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{overline}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Card({ title, sub, action, children }: {
  title?: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      {title && (
        <div className="section-head">
          <div>
            <h2 className="card-title">{title}</h2>
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Empty({ title, text, icon: Icon = ClipboardList }: {
  title: string;
  text: string;
  icon?: typeof ClipboardList;
}) {
  return (
    <div className="empty">
      <Icon size={27} strokeWidth={1.5} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function State({ loading, error, retry, children }: {
  loading: boolean;
  error: unknown;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading) return (
    <div className="card card-pad" aria-label="Loading">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
  if (error) {
    const forbidden = (error as { status?: number }).status === 403;
    return (
      <div className="card card-pad">
        <Empty
          icon={CircleHelp}
          title={forbidden ? 'Access restricted' : 'Unable to load this view'}
          text={forbidden
            ? 'Your account does not have permission to view this information.'
            : errText(error)}
        />
        <div style={{ textAlign: 'center' }}>
          <button className="btn" onClick={retry} data-testid="button-retry">Try again</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function Modal({ title, close, children }: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={event => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={close} aria-label="Close dialog" data-testid="button-close-dialog">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, name, type = 'text', required = false, defaultValue, children, min, max, step, autoComplete, pattern, placeholder }: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  children?: ReactNode;
  min?: number;
  max?: number;
  step?: number | string;
  autoComplete?: string;
  pattern?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      {label}
      {children || (
        <input
          data-testid={'input-' + name}
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
          autoComplete={autoComplete ?? (type === 'password' ? 'new-password' : undefined)}
          pattern={pattern}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

export function FormActions({ close, pending, label = 'Save changes' }: {
  close: () => void;
  pending: boolean;
  label?: string;
}) {
  return (
    <div className="modal-actions">
      <button type="button" className="btn" onClick={close} data-testid="button-cancel">Cancel</button>
      <button type="submit" className="btn primary" disabled={pending} data-testid="button-submit">
        {pending ? 'Saving…' : label}
      </button>
    </div>
  );
}

export function Person({ item }: { item: EmployeeSummary }) {
  return (
    <div className="person">
      <Avatar name={item.firstName + ' ' + item.lastName} />
      <div>
        <strong>{item.firstName} {item.lastName}</strong>
        <small>{item.email}</small>
      </div>
    </div>
  );
}
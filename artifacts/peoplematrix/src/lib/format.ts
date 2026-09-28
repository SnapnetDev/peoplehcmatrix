export const isHR = (role?: string) => role === 'HR_ADMIN';
export const isManager = (role?: string) => role === 'MANAGER';
export const isAdmin = (role?: string) => role === 'SYSTEM_ADMIN';
export const canReview = (role?: string) => isHR(role) || isManager(role);

export const labelRole = (role?: string) => ({
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  HR_ADMIN: 'HR administrator',
  SYSTEM_ADMIN: 'System administrator',
}[role || ''] || role || 'Member');

export const date = (value?: string | null) => value
  ? new Date(value.includes('T') ? value : value + 'T12:00:00')
      .toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

export const money = (value: string) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
}).format(Number(value));

export const initials = (name: string) => name
  .split(/\s+/)
  .map(part => part[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();

export const errText = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
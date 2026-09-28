import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLogin } from '@workspace/api-client-react';
import { Field } from '../components/workspace-ui';
import { errText } from '../lib/format';
import { client, TOKEN_KEY } from '../lib/session';
import './login.css';

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const login = useLogin();
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await login.mutateAsync({
        data: {
          email: String(form.get('email')),
          password: String(form.get('password')),
        },
      });
      sessionStorage.setItem(TOKEN_KEY, result.token);
      await client.cancelQueries();
      client.clear();
      onLogin(result.token);
    } catch (cause) {
      setError(errText(cause));
    }
  };

  return (
    <div className="login-page">
      <div className="login-art">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">P</span>
          <span>people<span>matrix</span></span>
        </div>
        <div>
          <div className="eyebrow" style={{ color: '#e7aa7b' }}>YOUR PEOPLE, IN FOCUS</div>
          <h1>Better work begins with <em>better care.</em></h1>
          <p>One considered place for your people, their progress, and the work that moves everyone forward.</p>
        </div>
        <small style={{ color: '#91b3b4', fontSize: 11 }}>
          PeopleMatrix Security Lab — Synthetic Data Only
        </small>
      </div>
      <div className="login-panel">
        <div className="login-inner">
          <div className="eyebrow" style={{ marginBottom: 13 }}>WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p>Enter your organisation credentials to continue.</p>
          <form onSubmit={submit}>
            <Field label="Work email" name="email" type="email" autoComplete="username" required />
            <Field label="Password" name="password" type="password" autoComplete="current-password" required />
            {error && <div className="error-box" role="alert">{error}</div>}
            <button
              className="btn primary"
              type="submit"
              disabled={login.isPending}
              data-testid="button-sign-in"
            >
              {login.isPending ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>
          <div className="login-security-note">
            Your session is protected and expires when this browser session ends.
          </div>
        </div>
        <small className="mobile-lab-note">PeopleMatrix Security Lab — Synthetic Data Only</small>
      </div>
    </div>
  );
}
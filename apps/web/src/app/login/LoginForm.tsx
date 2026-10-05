'use client';

import { useActionState, useId } from 'react';

import { login, type LoginState } from './actions';
import styles from './login.module.css';

interface LoginFormProps {
  next: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(login, {});
  const errorId = useId();

  return (
    <form action={formAction} className={styles.form} aria-describedby={state.error ? errorId : undefined}>
      <input type="hidden" name="next" value={next} />

      <label className={styles.field}>
        <span className={styles.label}>ID</span>
        <input
          className={styles.input}
          name="id"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={state.id}
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <input
          className={styles.input}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </label>

      {state.error && (
        <p id={errorId} className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={isPending} aria-busy={isPending}>
        {isPending ? '확인 중…' : '로그인'}
        <span className={styles.arrow} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12L12 2M12 2H4M12 2V10" />
          </svg>
        </span>
      </button>
    </form>
  );
}

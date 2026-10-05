import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isLoggedIn } from '@/lib/auth/server';
import { safeNextPath } from '@/lib/auth/session';

import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: '로그인 · GBTI 멤버활동 관리',
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);

  // 이미 로그인했으면 바로 대시보드로
  if (await isLoggedIn()) redirect(next);

  return (
    <div className={`container ${styles.page}`}>
      <section className={styles.card} aria-labelledby="login-title">
        <p className={styles.eyebrow}>Admin access</p>
        <h1 className={styles.title} id="login-title">
          Sign in
        </h1>
        <p className={styles.desc}>디스코드 서버 활동 대시보드는 관리자만 볼 수 있습니다.</p>
        <LoginForm next={next} />
      </section>
    </div>
  );
}

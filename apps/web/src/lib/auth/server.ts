import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionRole, SESSION_COOKIE, type SessionRole } from './session';

export async function getRole(): Promise<SessionRole | null> {
  const store = await cookies();
  return getSessionRole(store.get(SESSION_COOKIE)?.value);
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getRole()) !== null;
}

/** 페이지에서 한 번 더 확인 (proxy를 우회하는 경로가 생겨도 데이터가 새지 않게) */
export async function requireSession(nextPath = '/'): Promise<void> {
  if (!(await isLoggedIn())) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

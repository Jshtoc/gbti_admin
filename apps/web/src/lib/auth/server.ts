import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE, verifySessionToken } from './session';

export async function isLoggedIn(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** 페이지에서 한 번 더 확인 (proxy를 우회하는 경로가 생겨도 데이터가 새지 않게) */
export async function requireSession(nextPath = '/'): Promise<void> {
  if (!(await isLoggedIn())) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

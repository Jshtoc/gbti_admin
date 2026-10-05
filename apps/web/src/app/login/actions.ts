'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { isAdminConfigured, verifyCredentials } from '@/lib/auth/credentials';
import { createSessionToken, safeNextPath, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';

export interface LoginState {
  error?: string;
  /** 실패 시 아이디는 다시 채워준다 */
  id?: string;
}

const loginSchema = z.object({
  id: z.string().trim().min(1, '아이디를 입력하세요').max(64),
  password: z.string().min(1, '비밀번호를 입력하세요').max(128),
  next: z.string().max(2048).optional(),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    id: formData.get('id'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  const id = typeof formData.get('id') === 'string' ? String(formData.get('id')) : '';
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요', id };

  if (!isAdminConfigured()) {
    return { error: '서버에 관리자 계정(ADMIN_ID / ADMIN_PASSWORD)이 설정되지 않았습니다.', id };
  }

  if (!verifyCredentials(parsed.data.id, parsed.data.password)) {
    // 무차별 대입을 조금이라도 늦추기 위한 지연
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.', id };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(safeNextPath(parsed.data.next));
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}

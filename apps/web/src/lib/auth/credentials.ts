import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';

import type { SessionRole } from './session';

/** 관리자 계정은 환경 변수(ADMIN_ID / ADMIN_PASSWORD)로만 둔다. 공개 저장소에 비밀번호를 남기지 않기 위해서 */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_ID && process.env.ADMIN_PASSWORD);
}

/** 해시 후 비교해서 길이 차이로도 정보가 새지 않게 한다 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function matches(id: string, password: string, expectedId?: string, expectedPassword?: string): boolean {
  if (!expectedId || !expectedPassword) return false;
  // 둘 다 항상 비교 (어느 쪽이 틀렸는지 응답 시간으로 드러나지 않게)
  const idOk = safeEqual(id, expectedId);
  const passwordOk = safeEqual(password, expectedPassword);
  return idOk && passwordOk;
}

/**
 * 제한 계정(VIEWER_ID / VIEWER_PASSWORD / VIEWER_SHOW_USER_ID): 통계 제외 규칙으로 빠져 있는 VIEWER_SHOW_USER_ID 멤버가 이 계정에서만 보인다.
 * 관리자 계정과 마찬가지로 환경 변수로만 둔다.
 */
export function verifyCredentials(id: string, password: string): SessionRole | null {
  const admin = matches(id, password, process.env.ADMIN_ID, process.env.ADMIN_PASSWORD);
  const viewer =
    Boolean(process.env.VIEWER_SHOW_USER_ID) &&
    matches(id, password, process.env.VIEWER_ID, process.env.VIEWER_PASSWORD);
  if (admin) return 'admin';
  return viewer ? 'viewer' : null;
}

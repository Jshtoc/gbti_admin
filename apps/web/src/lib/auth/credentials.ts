import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';

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

export function verifyCredentials(id: string, password: string): boolean {
  const expectedId = process.env.ADMIN_ID;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedId || !expectedPassword) return false;
  // 둘 다 항상 비교 (어느 쪽이 틀렸는지 응답 시간으로 드러나지 않게)
  const idOk = safeEqual(id, expectedId);
  const passwordOk = safeEqual(password, expectedPassword);
  return idOk && passwordOk;
}

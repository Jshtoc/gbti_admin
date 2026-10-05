// 관리자 세션 토큰. proxy(라우팅 전)와 서버 컴포넌트 양쪽에서 쓰므로 Web Crypto만 사용한다.
// 토큰 = "v1.<만료 epoch ms>.<HMAC-SHA256 서명>" — 서버에 세션 저장소 없이 서명으로 위변조를 막는다.

export const SESSION_COOKIE = 'gbti_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

const encoder = new TextEncoder();

/**
 * 서명 키. 아이디/비밀번호가 바뀌면 키도 바뀌어 기존 세션이 모두 무효가 된다.
 * AUTH_SECRET을 따로 두면 그 값도 섞는다 (선택).
 */
function signingSecret(): string | null {
  const id = process.env.ADMIN_ID;
  const password = process.env.ADMIN_PASSWORD;
  if (!id || !password) return null;
  return `${process.env.AUTH_SECRET ?? ''}|${id}|${password}`;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

/** 길이와 무관하게 끝까지 비교 (타이밍으로 서명을 추측하지 못하게) */
function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const secret = signingSecret();
  if (!secret) throw new Error('ADMIN_ID / ADMIN_PASSWORD is not set');
  const payload = `v1.${now + SESSION_MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  const secret = signingSecret();
  if (!token || !secret) return false;

  const [version, expires, signature] = token.split('.');
  if (version !== 'v1' || !expires || !signature) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < now) return false;

  return constantTimeEqual(signature, await sign(`${version}.${expires}`, secret));
}

/** 로그인 후 돌아갈 경로. 외부 주소로 튕기는 open redirect를 막기 위해 내부 경로만 허용 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  return value.startsWith('/login') ? '/' : value;
}

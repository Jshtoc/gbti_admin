import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

/** 로그인하지 않은 요청은 /login 으로 보낸다 */
export async function proxy(request: NextRequest) {
  if (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
  else if (search) loginUrl.searchParams.set('next', `/${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 로그인 페이지, Next 정적 파일, 파비콘은 제외
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};

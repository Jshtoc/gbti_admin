import { NextResponse, type NextRequest } from 'next/server';

import { getSessionRole, SESSION_COOKIE } from '@/lib/auth/session';

/** 개요 전용 계정이 갈 수 있는 경로: 개요뿐 (API는 각자 권한 검사로 403) */
const isGuestPath = (pathname: string) => pathname === '/' || pathname.startsWith('/api/');

/** 로그인하지 않은 요청은 /login 으로, 개요 전용 계정이 다른 탭으로 가면 개요로 보낸다 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const role = await getSessionRole(request.cookies.get(SESSION_COOKIE)?.value);
  if (role === 'guest' && !isGuestPath(pathname)) return NextResponse.redirect(new URL('/', request.url));
  if (role) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
  else if (search) loginUrl.searchParams.set('next', `/${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 로그인 페이지, Next 정적 파일, 파비콘, 링크 미리보기 이미지(크롤러가 로그인 없이 가져가야 함)는 제외
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|opengraph-image).*)'],
};

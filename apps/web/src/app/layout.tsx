import type { Metadata } from 'next';
import { Inter, Jua, Noto_Sans_KR, Syne } from 'next/font/google';

import { SiteHeader } from '@/components/ui/SiteHeader';
import { isLoggedIn } from '@/lib/auth/server';

import './globals.css';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter' });
// 숫자 전용: 배달의민족 주아체 (자릿수 폭이 고르게 보인다)
const jua = Jua({ subsets: ['latin'], weight: '400', variable: '--font-jua' });
const notoKr = Noto_Sans_KR({
  weight: ['500', '700', '900'],
  variable: '--font-noto-kr',
  preload: false,
});

const SITE_TITLE = 'GBTI 멤버활동 관리';
const SITE_DESCRIPTION = '디스코드 서버 멤버의 음성 채널 활동, 같이 플레이한 멤버, 게임 기록을 한눈에 보는 관리자 대시보드';

/**
 * 링크 미리보기(카카오톡 등)는 이미지 주소가 https:// 절대 경로여야 한다.
 * SITE_URL > Vercel 프로덕션 도메인(자동 제공 환경 변수) > 로컬 순.
 */
const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3100');

// og:image 는 app/opengraph-image.tsx 가 자동으로 붙인다
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'GBTI',
    locale: 'ko_KR',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = await isLoggedIn();
  return (
    <html lang="ko" className={`${syne.variable} ${inter.variable} ${jua.variable} ${notoKr.variable}`}>
      <body>
        <SiteHeader dataSource={process.env.DATA_SOURCE === 'db' ? 'db' : 'mock'} loggedIn={loggedIn} />
        <main>{children}</main>
      </body>
    </html>
  );
}

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

export const metadata: Metadata = {
  title: 'GBTI Admin',
  description: '디스코드 서버 멤버 활동 대시보드',
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

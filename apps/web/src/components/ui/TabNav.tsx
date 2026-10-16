'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './TabNav.module.css';

const TABS = [
  { href: '/', label: '개요' },
  { href: '/last-seen', label: '마지막 접속 기록' },
];

/** 상단 탭 메뉴. 멤버 상세는 개요에 속하는 화면으로 본다 */
export function TabNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? !pathname.startsWith('/last-seen') : pathname.startsWith(href));

  return (
    <nav className={`container ${styles.nav}`} aria-label="메뉴">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={isActive(tab.href) ? 'page' : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

import Link from 'next/link';

import { logout } from '@/app/login/actions';

import styles from './SiteHeader.module.css';
import { TabNav } from './TabNav';

interface SiteHeaderProps {
  dataSource: 'db' | 'mock';
  loggedIn: boolean;
  /** 개요 전용 계정은 개요·탈퇴 유저 탭만 보인다 */
  guest?: boolean;
}

export function SiteHeader({ dataSource, loggedIn, guest = false }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          GBTI<span className={styles.brandSub}>Admin</span>
        </Link>
        <div className={styles.right}>
          <div className={styles.status} data-source={dataSource}>
            <span className={styles.dot} aria-hidden="true" />
            {dataSource === 'db' ? 'Live · PostgreSQL' : 'Mock data'}
          </div>
          {loggedIn && (
            <form action={logout}>
              <button type="submit" className={styles.logout}>
                로그아웃
              </button>
            </form>
          )}
        </div>
      </div>
      {loggedIn && <TabNav guest={guest} />}
    </header>
  );
}

import Link from 'next/link';

import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  dataSource: 'db' | 'mock';
}

export function SiteHeader({ dataSource }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          GBTI<span className={styles.brandSub}>Admin</span>
        </Link>
        <div className={styles.status} data-source={dataSource}>
          <span className={styles.dot} aria-hidden="true" />
          {dataSource === 'db' ? 'Live · PostgreSQL' : 'Mock data'}
        </div>
      </div>
    </header>
  );
}

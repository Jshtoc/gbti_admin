import Link from 'next/link';

import { formatDuration } from '@/lib/format';

import styles from './BarList.module.css';

export interface BarListItem {
  key: string;
  label: React.ReactNode;
  /** 막대 길이 기준 값 */
  value: number;
  /** 오른쪽에 표시할 값. 없으면 value를 초 단위 시간으로 표시 */
  valueText?: string;
  href?: string;
  /** 막대 아래에 붙는 추가 내용 (예: 스레드 목록) */
  detail?: React.ReactNode;
}

interface BarListProps {
  items: BarListItem[];
  emptyText: string;
  /** 1위부터 순번 표시 */
  ranked?: boolean;
}

/** 순위형 가로 막대 목록 (듀오 랭킹, 방 종류, 메시지 채널, 함께한 멤버, 게임별 시간) */
export function BarList({ items, emptyText, ranked = false }: BarListProps) {
  if (items.length === 0) return <p className={styles.empty}>{emptyText}</p>;

  const max = Math.max(...items.map((i) => i.value));

  return (
    <ol className={styles.list}>
      {items.map((item, index) => {
        const body = (
          <>
            {ranked && <span className={styles.rank}>{String(index + 1).padStart(2, '0')}</span>}
            <span className={styles.main}>
              <span className={styles.row}>
                <span className={styles.label}>{item.label}</span>
                <span className={styles.value}>{item.valueText ?? formatDuration(item.value)}</span>
              </span>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.fill} style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }} />
              </span>
            </span>
          </>
        );

        return (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className={`${styles.item} ${styles.link}`}>
                {body}
              </Link>
            ) : (
              <div className={styles.item}>{body}</div>
            )}
            {item.detail && <div className={styles.detail} data-ranked={ranked || undefined}>{item.detail}</div>}
          </li>
        );
      })}
    </ol>
  );
}

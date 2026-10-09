'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { MemberActivity } from '@gbti/db';

import { Avatar } from '@/components/ui/Avatar';
import { LinkPending } from '@/components/ui/LinkPending';
import { Reveal } from '@/components/ui/Reveal';
import { formatDuration, formatLastSeen } from '@/lib/format';
import { periodHref } from '@/lib/overviewQuery';
import type { Period } from '@/lib/period';

import styles from './LeastActiveList.module.css';

interface LeastActiveListProps {
  /** 접속이 적은 순으로 정렬된 전체 멤버 */
  members: MemberActivity[];
  period: Period;
  pageSize: number;
}

/** 보여줄 페이지 번호: 7쪽 이하면 전부, 넘으면 처음·끝·현재 주변만 (사이는 …) */
function pageItems(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total));
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) items.push('gap');
    items.push(p);
  });
  return items;
}

/** 접속이 가장 적은 멤버 (전체, 페이지 단위). 카드형 메뉴 패턴(라벨 pill + 타이틀 + 원형 화살표). */
export function LeastActiveList({ members, period, pageSize }: LeastActiveListProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));
  const current = Math.min(page, totalPages - 1);
  const start = current * pageSize;
  const visible = members.slice(start, start + pageSize);

  if (members.length === 0) return <p className={styles.empty}>표시할 멤버가 없습니다.</p>;

  return (
    <>
      <ul className={styles.list}>
        {visible.map((m, index) => (
          <li key={m.userId}>
            <Reveal index={index}>
              <Link href={periodHref(`/members/${m.userId}`, period)} className={styles.card}>
                <span className={styles.rank}>{start + index + 1}</span>
                <Avatar name={m.displayName} src={m.avatarUrl} />
                <span className={styles.body}>
                  <span className={styles.label} data-tone={m.lastSeenAt ? undefined : 'none'}>
                    마지막 접속 · {formatLastSeen(m.lastSeenAt)}
                  </span>
                  <span className={styles.title}>{m.displayName}</span>
                  <span className={styles.meta}>
                    음성 {formatDuration(m.voiceSeconds)} · 온라인 {formatDuration(m.onlineSeconds)}
                  </span>
                </span>
                <span className={styles.arrow}>
                  <LinkPending size={14}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12L12 2M12 2H4M12 2V10" />
                    </svg>
                  </LinkPending>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className={styles.pager} aria-label="접속 적은 멤버 페이지">
          <p className={styles.range}>
            <span className={styles.num}>
              {start + 1}–{start + visible.length}
            </span>{' '}
            / {members.length}명
          </p>
          <div className={styles.pages}>
            <button
              type="button"
              className={styles.step}
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label="이전 페이지"
            >
              ‹
            </button>
            {pageItems(current, totalPages).map((item, i) =>
              item === 'gap' ? (
                <span key={`gap-${i}`} className={styles.gap} aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={styles.page}
                  aria-current={item === current ? 'page' : undefined}
                  aria-label={`${item + 1}페이지`}
                  onClick={() => setPage(item)}
                >
                  {item + 1}
                </button>
              ),
            )}
            <button
              type="button"
              className={styles.step}
              onClick={() => setPage(current + 1)}
              disabled={current === totalPages - 1}
              aria-label="다음 페이지"
            >
              ›
            </button>
          </div>
        </nav>
      )}
    </>
  );
}

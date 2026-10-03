'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import type { MemberRef } from '@gbti/db';

import { overviewHref, type OverviewQuery } from '@/lib/overviewQuery';

import styles from './MemberSelect.module.css';

interface MemberSelectProps {
  members: Pick<MemberRef, 'userId' | 'displayName'>[];
  query: OverviewQuery;
}

/** 총 음성 시간·일별 그래프를 특정 멤버 기준으로 바꾸는 필터 */
export function MemberSelect({ members, query }: MemberSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const member = e.target.value || undefined;
    startTransition(() => router.push(overviewHref({ ...query, member }), { scroll: false }));
  };

  return (
    <label className={styles.wrap} data-selected={query.member ? true : undefined} aria-busy={isPending}>
      <span className="sr-only">멤버 선택</span>
      <select className={styles.select} value={query.member ?? ''} onChange={handleChange}>
        <option value="">전체 멤버</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.displayName}
          </option>
        ))}
      </select>
      <svg className={styles.chevron} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

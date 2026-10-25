'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { MemberListItem } from '@gbti/db';

import { Spinner } from '@/components/ui/Spinner';
import { timeParam, withParams } from '@/lib/overviewQuery';
import type { Period } from '@/lib/period';

import { MemberSelect } from './MemberSelect';
import styles from './PairSearch.module.css';

interface PairSearchProps {
  members: MemberListItem[];
  period: Period;
  a?: string;
  b?: string;
}

/** 멤버 두 명을 고르고 검색을 누르면 `?a=&b=` 로 이동한다 (기간·시간대 필터는 유지) */
export function PairSearch({ members, period, a, b }: PairSearchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [first, setFirst] = useState(a);
  const [second, setSecond] = useState(b);

  const same = first !== undefined && first === second;
  const ready = first !== undefined && second !== undefined && !same;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    startTransition(() =>
      router.push(withParams('/pair', { a: first, b: second, from: period.from, to: period.to, time: timeParam(period) }), {
        scroll: false,
      }),
    );
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <MemberSelect label="1번째 멤버" members={members} value={first} onChange={setFirst} />
      <span className={styles.amp} aria-hidden="true">
        &amp;
      </span>
      <MemberSelect label="2번째 멤버" members={members} value={second} onChange={setSecond} />
      <button type="submit" className={styles.submit} disabled={!ready || isPending} aria-busy={isPending}>
        {isPending ? <Spinner size={14} label="검색 중" /> : '검색'}
      </button>
      {same && <p className={styles.hint}>서로 다른 두 멤버를 골라주세요.</p>}
    </form>
  );
}

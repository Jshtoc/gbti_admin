'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { formatTimeOfDay } from '@/lib/format';
import { searchMembers } from '@/lib/memberSearch';

import styles from './LastSeenList.module.css';

/** 서버에서 직렬화해 넘기는 행 */
export interface AvgJoinRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  avgSecondOfDay: number | null;
  days: number;
}

interface AvgJoinListProps {
  /** 이른 시간 순으로 정렬된 전체 멤버 */
  rows: AvgJoinRow[];
  /** 평균을 낸 최근 일수 */
  days: number;
}

/** 멤버별 평균 첫 음성방 입장 시각. 마지막 접속 기록과 같은 목록 형식 */
export function AvgJoinList({ rows, days }: AvgJoinListProps) {
  const [text, setText] = useState('');
  const visible = useMemo(() => searchMembers(rows, text), [rows, text]);

  return (
    <>
      <div className={styles.search}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          className={styles.input}
          aria-label="멤버 검색"
          placeholder="이름·아이디·초성 검색"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <p className={styles.count}>
          <span className={styles.num}>{visible.length}</span> / {rows.length}명
        </p>
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty}>검색 결과가 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((m) => (
            <li key={m.userId}>
              <Link href={`/members/${m.userId}`} className={styles.row}>
                <Avatar name={m.displayName} src={m.avatarUrl} />
                <span className={styles.who}>
                  <span className={styles.name}>{m.displayName}</span>
                  <span className={styles.room}>
                    {m.avgSecondOfDay === null ? `최근 ${days}일 음성 기록 없음` : `최근 ${days}일 중 ${m.days}일 접속`}
                  </span>
                </span>
                <span className={styles.when}>
                  {m.avgSecondOfDay === null ? (
                    <span className={styles.none}>기록 없음</span>
                  ) : (
                    <span className={styles.abs}>{formatTimeOfDay(m.avgSecondOfDay)}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

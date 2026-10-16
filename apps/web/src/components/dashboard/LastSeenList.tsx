'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { formatDateTime, formatLeftAgo } from '@/lib/format';
import { searchMembers } from '@/lib/memberSearch';

import styles from './LastSeenList.module.css';

/** 서버에서 직렬화해 넘기는 행 (Date 대신 epoch ms) */
export interface LastSeenRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  leftAtMs: number | null;
  inVoice: boolean;
  channelName: string | null;
}

interface LastSeenListProps {
  /** 최근 순으로 정렬된 전체 멤버 */
  rows: LastSeenRow[];
  /** 서버 렌더 시각 (hydration 시 "N분 전" 표기가 어긋나지 않게 고정) */
  nowMs: number;
}

/** 멤버별 마지막 음성방 퇴장 시각. 검색(이름·아이디·초성)하면 해당 멤버만 바로 보인다 */
export function LastSeenList({ rows, nowMs }: LastSeenListProps) {
  const [text, setText] = useState('');
  const now = useMemo(() => new Date(nowMs), [nowMs]);
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
                  <span className={styles.room}>{m.channelName ?? '음성방 기록 없음'}</span>
                </span>
                <span className={styles.when}>
                  {m.inVoice ? (
                    <span className={styles.live}>
                      <span className={styles.liveDot} aria-hidden="true" />
                      지금 음성 중
                    </span>
                  ) : m.leftAtMs !== null ? (
                    <>
                      <span className={styles.abs}>{formatDateTime(new Date(m.leftAtMs))}</span>
                      <span className={styles.ago}>{formatLeftAgo(new Date(m.leftAtMs), now)}</span>
                    </>
                  ) : (
                    <span className={styles.none}>기록 없음</span>
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

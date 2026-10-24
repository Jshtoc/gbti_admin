'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { searchMembers } from '@/lib/memberSearch';
import { formatDuration } from '@/lib/format';

import base from './LastSeenList.module.css';
import styles from './IdleList.module.css';

/** 서버에서 직렬화해 넘기는 행 */
export interface IdleRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  voiceSeconds: number;
  idleSeconds: number;
}

interface IdleListProps {
  /** 잠수 시간 많은 순으로 정렬된 전체 멤버 */
  rows: IdleRow[];
}

/** 0보다 크면 최소 1%로 보여준다 ("0%"는 잠수가 전혀 없을 때만) */
function percentOf(row: IdleRow): number {
  if (row.voiceSeconds <= 0 || row.idleSeconds <= 0) return 0;
  return Math.max(1, Math.round((row.idleSeconds / row.voiceSeconds) * 100));
}

/** 멤버별 잠수(마이크 끈) 시간과 전체 음성 시간 대비 비율. 마지막 접속 기록과 같은 목록 형식 */
export function IdleList({ rows }: IdleListProps) {
  const [text, setText] = useState('');
  const visible = useMemo(() => searchMembers(rows, text), [rows, text]);

  return (
    <>
      <div className={base.search}>
        <svg className={base.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          className={base.input}
          aria-label="멤버 검색"
          placeholder="이름·아이디·초성 검색"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <p className={base.count}>
          <span className={base.num}>{visible.length}</span> / {rows.length}명
        </p>
      </div>

      {visible.length === 0 ? (
        <p className={base.empty}>검색 결과가 없습니다.</p>
      ) : (
        <ul className={base.list}>
          {visible.map((m) => {
            const percent = percentOf(m);
            return (
              <li key={m.userId}>
                <Link href={`/members/${m.userId}`} className={base.row}>
                  <Avatar name={m.displayName} src={m.avatarUrl} />
                  <span className={base.who}>
                    <span className={base.name}>{m.displayName}</span>
                    <span className={base.room}>
                      {m.voiceSeconds > 0 ? `전체 음성 ${formatDuration(m.voiceSeconds)} 중` : '음성 기록 없음'}
                    </span>
                    {m.voiceSeconds > 0 && (
                      <span className={styles.track} aria-hidden="true">
                        <span className={styles.fill} style={{ width: `${percent}%` }} />
                      </span>
                    )}
                  </span>
                  <span className={base.when}>
                    {m.voiceSeconds > 0 ? (
                      <>
                        <span className={styles.percent}>{percent}%</span>
                        <span className={base.ago}>{m.idleSeconds > 0 ? formatDuration(m.idleSeconds) : '잠수 없음'}</span>
                      </>
                    ) : (
                      <span className={base.none}>기록 없음</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

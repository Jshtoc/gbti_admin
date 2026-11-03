'use client';

import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { accountRows, stripNameTag, type AccountIds } from '@/lib/accountCopy';
import { formatDateTime, formatLeftAgo } from '@/lib/format';
import { searchMembers } from '@/lib/memberSearch';

import { CopyButtons } from './CopyButtons';
import styles from './DepartedList.module.css';

/** 서버에서 직렬화해 넘기는 행 (Date 대신 epoch ms) */
export interface DepartedRow extends AccountIds {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  leftAtMs: number;
}

interface DepartedListProps {
  /** 최근에 나간 순으로 정렬된 탈퇴 멤버 */
  rows: DepartedRow[];
  /** 서버 렌더 시각 (hydration 시 "N일 전" 표기가 어긋나지 않게 고정) */
  nowMs: number;
}

/** 서버를 나간 멤버 목록. 나간 시각과 계정 정보를 보여주고 복사 버튼을 둔다. 검색(이름·아이디·초성) 지원 */
export function DepartedList({ rows, nowMs }: DepartedListProps) {
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
          aria-label="탈퇴 유저 검색"
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

      {rows.length === 0 ? (
        <p className={styles.empty}>서버를 나간 멤버 기록이 없습니다.</p>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>검색 결과가 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((m) => {
            const filled = accountRows(m).filter(([, value]) => value.trim());
            const leftAt = new Date(m.leftAtMs);
            return (
              <li key={m.userId} className={styles.card}>
                <div className={styles.head}>
                  <Avatar name={m.displayName} src={m.avatarUrl} />
                  <span className={styles.who}>
                    <span className={styles.name}>{stripNameTag(m.displayName)}</span>
                    <span className={styles.sub}>@{m.username}</span>
                  </span>
                  <span className={styles.when}>
                    <span className={styles.abs}>{formatDateTime(leftAt)}</span>
                    <span className={styles.ago}>{formatLeftAgo(leftAt, now).replace('방금 나감', '방금')} 퇴장</span>
                  </span>
                </div>

                {filled.length > 0 ? (
                  <dl className={styles.ids}>
                    {filled.map(([label, value]) => (
                      <div key={label} className={styles.id}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className={styles.noInfo}>입력된 계정 정보 없음</p>
                )}

                <CopyButtons
                  displayName={m.displayName}
                  lolId={m.lolId}
                  steamId={m.steamId}
                  pubgId={m.pubgId}
                  robloxId={m.robloxId}
                  overwatchId={m.overwatchId}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

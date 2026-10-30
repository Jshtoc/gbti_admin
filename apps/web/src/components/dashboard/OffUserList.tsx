'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { searchMembers } from '@/lib/memberSearch';

import listStyles from './LastSeenList.module.css';

export interface OffUserRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface OffUserListProps {
  rows: OffUserRow[];
}

/** 온라인 상태가 아닌데 음성방·채팅 기록이 잡힌 멤버 명단 */
export function OffUserList({ rows }: OffUserListProps) {
  const [text, setText] = useState('');
  const visible = useMemo(() => searchMembers(rows, text), [rows, text]);

  return (
    <>
      <div className={listStyles.search}>
        <svg className={listStyles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          className={listStyles.input}
          aria-label="멤버 검색"
          placeholder="이름·아이디·초성 검색"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <p className={listStyles.count}>
          <span className={listStyles.num}>{visible.length}</span> / {rows.length}명
        </p>
      </div>

      {rows.length === 0 ? (
        <p className={listStyles.empty}>아직 잡힌 멤버가 없습니다.</p>
      ) : visible.length === 0 ? (
        <p className={listStyles.empty}>검색 결과가 없습니다.</p>
      ) : (
        <ul className={listStyles.list}>
          {visible.map((m) => (
            <li key={m.userId}>
              <Link href={`/members/${m.userId}`} className={listStyles.row}>
                <Avatar name={m.displayName} src={m.avatarUrl} />
                <span className={listStyles.who}>
                  <span className={listStyles.name}>{m.displayName}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { searchMembers } from '@/lib/memberSearch';

import searchStyles from './LastSeenList.module.css';
import styles from './OffControlLog.module.css';

/** 서버에서 넘기는 기록 한 줄 (날짜·시·멤버·종류별로 이미 묶여 있고 최근 순) */
export interface OffControlRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  /** KST 날짜 YYYY-MM-DD */
  day: string;
  /** KST 시 (0~23) */
  hour: number;
  source: 'voice' | 'message';
}

interface OffControlLogProps {
  rows: OffControlRow[];
}

interface HourGroup {
  hour: number;
  members: { userId: string; displayName: string; avatarUrl: string | null; sources: ('voice' | 'message')[] }[];
}

interface DayGroup {
  day: string;
  hours: HourGroup[];
  memberCount: number;
}

const SOURCE_LABEL = { voice: '음성', message: '채팅' } as const;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "2026-10-31" → "10월 31일 (토)" */
function dayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAYS[date.getUTCDay()]})`;
}

/** 날짜 → 시 → 멤버로 묶는다 (입력이 이미 최근 순이라 순서는 그대로 유지) */
function groupByDay(rows: OffControlRow[]): DayGroup[] {
  const days = new Map<string, Map<number, HourGroup['members']>>();
  for (const r of rows) {
    const hours = days.get(r.day) ?? new Map<number, HourGroup['members']>();
    const members = hours.get(r.hour) ?? [];
    const existing = members.find((m) => m.userId === r.userId);
    if (existing) existing.sources.push(r.source);
    else members.push({ userId: r.userId, displayName: r.displayName, avatarUrl: r.avatarUrl, sources: [r.source] });
    hours.set(r.hour, members);
    days.set(r.day, hours);
  }
  return [...days].map(([day, hours]) => ({
    day,
    hours: [...hours].map(([hour, members]) => ({ hour, members })),
    memberCount: new Set([...hours.values()].flatMap((ms) => ms.map((m) => m.userId))).size,
  }));
}

/** 온라인 상태가 아닌데 음성방·채팅이 잡힌 멤버를 일별·시간대별로 보여주는 기록 */
export function OffControlLog({ rows }: OffControlLogProps) {
  const [text, setText] = useState('');
  const visible = useMemo(() => searchMembers(rows, text), [rows, text]);
  const days = useMemo(() => groupByDay(visible), [visible]);
  const totalMembers = useMemo(() => new Set(rows.map((r) => r.userId)).size, [rows]);
  const visibleMembers = useMemo(() => new Set(visible.map((r) => r.userId)).size, [visible]);

  return (
    <>
      <div className={searchStyles.search}>
        <svg className={searchStyles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          className={searchStyles.input}
          aria-label="멤버 검색"
          placeholder="이름·아이디·초성 검색"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <p className={searchStyles.count}>
          <span className={searchStyles.num}>{visibleMembers}</span> / {totalMembers}명
        </p>
      </div>

      {rows.length === 0 ? (
        <p className={searchStyles.empty}>아직 잡힌 기록이 없습니다.</p>
      ) : days.length === 0 ? (
        <p className={searchStyles.empty}>검색 결과가 없습니다.</p>
      ) : (
        <div className={styles.days}>
          {days.map((d) => (
            <section key={d.day} className={styles.day}>
              <h2 className={styles.dayHead}>
                <span className={styles.dayName}>{dayLabel(d.day)}</span>
                <span className={styles.dayCount}>
                  <span className={styles.num}>{d.memberCount}</span>명
                </span>
              </h2>
              <ul className={styles.hours}>
                {d.hours.map((h) => (
                  <li key={h.hour} className={styles.hourRow}>
                    <span className={styles.hour}>
                      <span className={styles.num}>{String(h.hour).padStart(2, '0')}</span>시
                    </span>
                    <ul className={styles.members}>
                      {h.members.map((m) => (
                        <li key={m.userId}>
                          <Link href={`/members/${m.userId}`} className={styles.chip}>
                            <Avatar name={m.displayName} src={m.avatarUrl} size="sm" />
                            <span className={styles.name}>{m.displayName}</span>
                            {m.sources.map((s) => (
                              <span key={s} className={styles.source} data-source={s}>
                                {SOURCE_LABEL[s]}
                              </span>
                            ))}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

import Link from 'next/link';

import type { MemberActivity } from '@gbti/db';

import { Avatar } from '@/components/ui/Avatar';
import { formatCount, formatDuration, formatLastSeen } from '@/lib/format';
import type { MemberSortKey } from '@/lib/memberSort';
import { overviewHref, periodHref, type OverviewQuery } from '@/lib/overviewQuery';

import styles from './MemberTable.module.css';

interface MemberTableProps {
  members: MemberActivity[];
  query: OverviewQuery;
}

const COLUMNS: { key: MemberSortKey; label: string }[] = [
  { key: 'voice', label: '음성' },
  { key: 'online', label: '온라인' },
  { key: 'messages', label: '메시지' },
  { key: 'lastSeen', label: '마지막 접속' },
];

/** PC는 표, 모바일(640px 이하)은 카드 목록으로 보여준다 */
export function MemberTable({ members, query }: MemberTableProps) {
  const sort = query.sort ?? 'voice';
  const sortHref = (key: MemberSortKey) => overviewHref({ ...query, sort: key }, 'members');
  const detailHref = (userId: string) => periodHref(`/members/${userId}`, query.period);

  return (
    <>
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.rankCol}>
                #
              </th>
              <th scope="col">멤버</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={styles.num}
                  aria-sort={col.key === sort ? 'descending' : undefined}
                >
                  <Link
                    href={sortHref(col.key)}
                    className={styles.sortLink}
                    data-active={col.key === sort || undefined}
                    scroll={false}
                  >
                    {col.label}
                    <span aria-hidden="true">{col.key === sort ? ' ↓' : ''}</span>
                  </Link>
                </th>
              ))}
              <th scope="col">주 게임</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, index) => (
              <tr key={m.userId} data-selected={m.userId === query.member || undefined}>
                <td className={styles.rankCol}>{index + 1}</td>
                <td>
                  <Link href={detailHref(m.userId)} className={styles.member}>
                    <Avatar name={m.displayName} src={m.avatarUrl} size="sm" />
                    <span className={styles.names}>
                      <span className={styles.displayName}>{m.displayName}</span>
                      <span className={styles.username}>@{m.username}</span>
                    </span>
                  </Link>
                </td>
                <td className={styles.num}>{formatDuration(m.voiceSeconds)}</td>
                <td className={styles.num}>{formatDuration(m.onlineSeconds)}</td>
                <td className={styles.num}>{formatCount(m.messageCount)}</td>
                <td className={styles.num}>{formatLastSeen(m.lastSeenAt)}</td>
                <td className={styles.game}>{m.topGame ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobile}>
        <nav className={styles.sortChips} aria-label="정렬 기준">
          {COLUMNS.map((col) => (
            <Link
              key={col.key}
              href={sortHref(col.key)}
              className={styles.chip}
              aria-current={col.key === sort ? 'true' : undefined}
              scroll={false}
            >
              {col.label}
            </Link>
          ))}
        </nav>

        <ol className={styles.cards}>
          {members.map((m, index) => (
            <li key={m.userId}>
              <Link
                href={detailHref(m.userId)}
                className={styles.card}
                data-selected={m.userId === query.member || undefined}
              >
                <span className={styles.cardHead}>
                  <span className={styles.cardRank}>{index + 1}</span>
                  <Avatar name={m.displayName} src={m.avatarUrl} size="sm" />
                  <span className={styles.names}>
                    <span className={styles.displayName}>{m.displayName}</span>
                    <span className={styles.username}>{m.topGame ?? '게임 기록 없음'}</span>
                  </span>
                </span>
                <dl className={styles.cardStats}>
                  <div data-active={sort === 'voice' || undefined}>
                    <dt>음성</dt>
                    <dd>{formatDuration(m.voiceSeconds)}</dd>
                  </div>
                  <div data-active={sort === 'online' || undefined}>
                    <dt>온라인</dt>
                    <dd>{formatDuration(m.onlineSeconds)}</dd>
                  </div>
                  <div data-active={sort === 'messages' || undefined}>
                    <dt>메시지</dt>
                    <dd>{formatCount(m.messageCount)}</dd>
                  </div>
                  <div data-active={sort === 'lastSeen' || undefined}>
                    <dt>마지막 접속</dt>
                    <dd>{formatLastSeen(m.lastSeenAt)}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

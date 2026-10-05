import Link from 'next/link';

import type { MemberActivity } from '@gbti/db';

import { Avatar } from '@/components/ui/Avatar';
import { LinkPending } from '@/components/ui/LinkPending';
import { Reveal } from '@/components/ui/Reveal';
import { formatDuration, formatLastSeen } from '@/lib/format';
import { periodHref } from '@/lib/overviewQuery';
import type { Period } from '@/lib/period';

import styles from './LeastActiveList.module.css';

interface LeastActiveListProps {
  members: MemberActivity[];
  period: Period;
}

/** 접속이 가장 적은 멤버. 카드형 메뉴 패턴(라벨 pill + 타이틀 + 원형 화살표). */
export function LeastActiveList({ members, period }: LeastActiveListProps) {
  return (
    <ul className={styles.list}>
      {members.map((m, index) => (
        <li key={m.userId}>
          <Reveal index={index}>
            <Link href={periodHref(`/members/${m.userId}`, period)} className={styles.card}>
              <Avatar name={m.displayName} src={m.avatarUrl} />
              <span className={styles.body}>
                <span className={styles.label} data-tone={m.lastSeenAt ? undefined : 'none'}>
                  마지막 접속 · {formatLastSeen(m.lastSeenAt)}
                </span>
                <span className={styles.title}>{m.displayName}</span>
                <span className={styles.meta}>
                  온라인 {formatDuration(m.onlineSeconds)} · 음성 {formatDuration(m.voiceSeconds)}
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
  );
}

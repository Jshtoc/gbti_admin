import type { OnlineOutsideVoice } from '@gbti/db';

import { Avatar } from '@/components/ui/Avatar';
import { MemberLink } from '@/components/ui/MemberLink';
import { Reveal } from '@/components/ui/Reveal';
import { formatLastSeen } from '@/lib/format';
import { periodHref } from '@/lib/overviewQuery';
import type { Period } from '@/lib/period';

import styles from './OnlineOutsideVoiceList.module.css';

const STATUS_LABEL: Record<OnlineOutsideVoice['status'], string> = {
  online: '온라인',
  idle: '자리비움',
  dnd: '방해금지',
};

interface OnlineOutsideVoiceListProps {
  /** 온라인 상태 → 이름 순으로 정렬된 멤버 */
  members: OnlineOutsideVoice[];
  period: Period;
  /** false면 멤버 상세 링크를 없앤다 (개요 전용 계정) */
  linked?: boolean;
}

/** 지금 온라인인데 음성방에 없는 멤버. 조회 시점 기준(실시간 갱신 아님). */
export function OnlineOutsideVoiceList({ members, period, linked = true }: OnlineOutsideVoiceListProps) {
  if (members.length === 0) {
    return <p className={styles.empty}>지금 온라인이면서 음성방에 없는 멤버가 없습니다.</p>;
  }

  const now = new Date();

  return (
    <ul className={styles.list}>
      {members.map((m, index) => (
        <li key={m.userId}>
          <Reveal index={Math.min(index, 8)}>
            <MemberLink href={periodHref(`/members/${m.userId}`, period)} linked={linked} className={styles.card}>
              <Avatar name={m.displayName} src={m.avatarUrl} size="sm" />
              <span className={styles.body}>
                <span className={styles.title}>{m.displayName}</span>
                <span className={styles.meta}>
                  {m.game ? `${m.game} · ` : ''}
                  {formatLastSeen(m.since, now)} 접속
                </span>
              </span>
              <span className={styles.status} data-status={m.status}>
                {STATUS_LABEL[m.status]}
              </span>
            </MemberLink>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

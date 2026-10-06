import type { VoiceSessionGroup } from '@gbti/db';

import { formatDateTime, formatDuration } from '@/lib/format';

import styles from './VoiceSessionList.module.css';

interface VoiceSessionListProps {
  groups: VoiceSessionGroup[];
}

/** 방제목별로 묶은 음성 세션 (방제목 · 횟수/마지막 입장 · 체류 시간). 지금 그 방에 있으면 LIVE */
export function VoiceSessionList({ groups }: VoiceSessionListProps) {
  if (groups.length === 0) return <p className={styles.empty}>이 기간에 음성 채널 기록이 없습니다.</p>;

  return (
    <ul className={styles.sessions}>
      {groups.map((g) => (
        <li key={g.channelName} className={styles.session}>
          <span className={styles.channel}>
            {g.channelName}
            {g.live && <span className={styles.live}>LIVE</span>}
          </span>
          <span className={styles.when}>
            {g.count}회 · 마지막 {formatDateTime(g.lastStartedAt)}
          </span>
          <span className={styles.duration}>{formatDuration(g.seconds)}</span>
        </li>
      ))}
    </ul>
  );
}

import type { ChannelKind, MessageChannelCount } from '@gbti/db';

import { formatCount } from '@/lib/format';
import { groupMessageChannels } from '@/lib/messageChannels';

import { BarList } from './BarList';
import styles from './MessageChannels.module.css';

interface MessageChannelsProps {
  rows: MessageChannelCount[];
}

const KIND_LABEL: Record<ChannelKind, string> = {
  text: '텍스트',
  forum: '포럼',
  thread: '스레드',
  voice: '음성채팅',
  other: '채널',
};

/** 채널별 메시지 수. 스레드가 있으면 펼쳐서 스레드별 대화량을 본다 */
export function MessageChannels({ rows }: MessageChannelsProps) {
  const groups = groupMessageChannels(rows);

  return (
    <BarList
      ranked
      emptyText="이 기간에 메시지 기록이 없습니다."
      items={groups.map((g) => {
        const threadMax = Math.max(0, ...g.threads.map((t) => t.count));
        return {
          key: g.channelId,
          value: g.total,
          valueText: `${formatCount(g.total)}개`,
          label: (
            <>
              <span className={styles.name}>{g.kind === 'voice' ? g.name : `# ${g.name}`}</span>
              <span className={styles.kind}>{KIND_LABEL[g.kind]}</span>
            </>
          ),
          detail:
            g.threads.length > 0 ? (
              <details className={styles.threads}>
                <summary className={styles.summary}>
                  스레드 {g.threads.length}개
                  {g.direct > 0 && <span className={styles.direct}> · 채널 본문 {formatCount(g.direct)}개</span>}
                </summary>
                <ul className={styles.threadList}>
                  {g.threads.map((t) => (
                    <li key={t.channelId} className={styles.thread}>
                      <span className={styles.threadRow}>
                        <span className={styles.threadName}>{t.name}</span>
                        <span className={styles.threadCount}>{formatCount(t.count)}개</span>
                      </span>
                      <span className={styles.threadTrack} aria-hidden="true">
                        <span className={styles.threadFill} style={{ width: `${(t.count / threadMax) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : undefined,
        };
      })}
    />
  );
}

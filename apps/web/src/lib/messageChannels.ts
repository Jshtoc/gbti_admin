import type { ChannelKind, MessageChannelCount } from '@gbti/db';

export interface ThreadCount {
  channelId: string;
  name: string;
  count: number;
}

export interface ChannelGroup {
  channelId: string;
  name: string;
  kind: ChannelKind;
  /** 채널 자체 + 스레드 합계 */
  total: number;
  /** 채널 본문(스레드 밖)에 올라온 메시지 */
  direct: number;
  threads: ThreadCount[];
}

/** 스레드 메시지를 상위 채널(포럼/텍스트) 아래로 묶는다. 합계 많은 순, 스레드도 많은 순 */
export function groupMessageChannels(rows: MessageChannelCount[]): ChannelGroup[] {
  const groups = new Map<string, ChannelGroup>();
  const groupFor = (channelId: string, name: string, kind: ChannelKind) => {
    let group = groups.get(channelId);
    if (!group) {
      group = { channelId, name, kind, total: 0, direct: 0, threads: [] };
      groups.set(channelId, group);
    }
    return group;
  };

  for (const row of rows) {
    if (row.kind === 'thread' && row.parentId) {
      const parent = groupFor(row.parentId, row.parentName ?? `#${row.parentId}`, row.parentKind ?? 'other');
      parent.threads.push({ channelId: row.channelId, name: row.name, count: row.count });
      parent.total += row.count;
    } else {
      const group = groupFor(row.channelId, row.name, row.kind);
      // 스레드 행이 먼저 와서 상위 채널이 이름 없이 만들어졌을 수 있으므로 갱신
      group.name = row.name;
      group.kind = row.kind;
      group.direct += row.count;
      group.total += row.count;
    }
  }

  const result = [...groups.values()];
  for (const group of result) group.threads.sort((a, b) => b.count - a.count);
  return result.sort((a, b) => b.total - a.total);
}

import { z } from 'zod';

import type { MemberActivity } from '@gbti/db';

export const MEMBER_SORT_KEYS = ['voice', 'online', 'lastSeen'] as const;
export type MemberSortKey = (typeof MEMBER_SORT_KEYS)[number];

const sortSchema = z.enum(MEMBER_SORT_KEYS).catch('voice');

export function parseMemberSort(value: unknown): MemberSortKey {
  return sortSchema.parse(Array.isArray(value) ? value[0] : value);
}

const lastSeenTime = (m: MemberActivity) => m.lastSeenAt?.getTime() ?? 0;

/** 모든 컬럼은 "많은/최근 순"으로 내림차순 */
export function sortMembers(members: MemberActivity[], key: MemberSortKey): MemberActivity[] {
  const value: Record<MemberSortKey, (m: MemberActivity) => number> = {
    voice: (m) => m.voiceSeconds,
    online: (m) => m.onlineSeconds,
    lastSeen: lastSeenTime,
  };
  return [...members].sort((a, b) => value[key](b) - value[key](a));
}

/** 접속이 가장 적은 순: 음성 시간(20~03시 필터면 그 시간대 음성 시간) → 온라인 시간 → 마지막 접속이 오래된 순 */
export function leastActive(members: MemberActivity[], limit: number): MemberActivity[] {
  return [...members]
    .sort(
      (a, b) => a.voiceSeconds - b.voiceSeconds || a.onlineSeconds - b.onlineSeconds || lastSeenTime(a) - lastSeenTime(b),
    )
    .slice(0, limit);
}

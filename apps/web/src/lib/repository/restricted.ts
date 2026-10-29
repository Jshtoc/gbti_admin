import 'server-only';

import type { DashboardRepository } from './types';

/**
 * 제한 계정용: 닉네임이 memberName인 멤버 한 명의 데이터만 돌려준다.
 * 멤버 목록·집계는 그 멤버만 남기고, 멤버 ID를 받는 조회는 다른 멤버면 빈 결과로 막는다.
 */
export function restrictRepository(repo: DashboardRepository, memberName: string): DashboardRepository {
  let allowedId: Promise<string | undefined> | undefined;
  const resolveAllowedId = () => {
    allowedId ??= repo.getMembers().then((members) => members.find((m) => m.displayName === memberName)?.userId);
    return allowedId;
  };
  const only = async <T extends { userId: string }>(rows: Promise<T[]>): Promise<T[]> => {
    const id = await resolveAllowedId();
    return (await rows).filter((row) => row.userId === id);
  };
  /** 허용된 멤버의 ID일 때만 조회하고, 아니면 빈 값 */
  const forAllowed = async <T>(userId: string, fallback: T, run: () => Promise<T>): Promise<T> =>
    (await resolveAllowedId()) === userId ? run() : fallback;

  return {
    getMembers: () => only(repo.getMembers()),
    getMemberActivity: (range) => only(repo.getMemberActivity(range)),
    getLastVoiceExits: () => only(repo.getLastVoiceExits()),
    getAverageFirstJoins: () => only(repo.getAverageFirstJoins()),
    getMemberIdle: (range) => only(repo.getMemberIdle(range)),
    // 서버 전체 듀오 순위·두 멤버 조회는 다른 멤버가 드러나므로 막는다
    getCoPlayPairs: async () => [],
    getPairTime: async () => null,
    getPartners: (userId, range, limit) => forAllowed(userId, [], () => repo.getPartners(userId, range, limit)),
    getDailyVoice: async (range, userId) => {
      const id = await resolveAllowedId();
      return id && (!userId || userId === id) ? repo.getDailyVoice(range, id) : [];
    },
    getGameTimes: (userId, range) => forAllowed(userId, [], () => repo.getGameTimes(userId, range)),
    getVoiceSessionGroups: (userId, range, limit) =>
      forAllowed(userId, [], () => repo.getVoiceSessionGroups(userId, range, limit)),
  };
}

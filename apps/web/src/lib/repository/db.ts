import 'server-only';

import * as queries from '@gbti/db';

import type { DashboardRepository } from './types';

/** showUserId: 통계 제외 규칙과 관계없이 보여줄 멤버 (제한 계정용) */
export function createDbRepository(guildId: string, showUserId?: string): DashboardRepository {
  return {
    getMembers: () => queries.getMembers(guildId, showUserId),
    getMemberActivity: (range) => queries.getMemberActivity(guildId, range, showUserId),
    getLastVoiceExits: () => queries.getLastVoiceExits(guildId, showUserId),
    getAverageFirstJoins: () => queries.getAverageFirstJoins(guildId, showUserId),
    getMemberIdle: (range) => queries.getMemberIdle(guildId, range, showUserId),
    getCoPlayPairs: (range, limit) => queries.getCoPlayPairs(guildId, range, limit, showUserId),
    getPairTime: (aId, bId, range) => queries.getPairTime(guildId, aId, bId, range, showUserId),
    getPartners: (userId, range, limit) => queries.getPartners(guildId, userId, range, limit, showUserId),
    getDailyVoice: (range, userId) => queries.getDailyVoice(guildId, range, userId),
    getGameTimes: (userId, range) => queries.getGameTimes(guildId, userId, range),
    getVoiceSessionGroups: (userId, range, limit) =>
      queries.getVoiceSessionGroups(guildId, userId, range, limit),
  };
}

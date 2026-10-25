import 'server-only';

import * as queries from '@gbti/db';

import type { DashboardRepository } from './types';

export function createDbRepository(guildId: string): DashboardRepository {
  return {
    getMembers: () => queries.getMembers(guildId),
    getMemberActivity: (range) => queries.getMemberActivity(guildId, range),
    getLastVoiceExits: () => queries.getLastVoiceExits(guildId),
    getAverageFirstJoins: () => queries.getAverageFirstJoins(guildId),
    getMemberIdle: (range) => queries.getMemberIdle(guildId, range),
    getCoPlayPairs: (range, limit) => queries.getCoPlayPairs(guildId, range, limit),
    getPairTime: (aId, bId, range) => queries.getPairTime(guildId, aId, bId, range),
    getPartners: (userId, range, limit) => queries.getPartners(guildId, userId, range, limit),
    getDailyVoice: (range, userId) => queries.getDailyVoice(guildId, range, userId),
    getGameTimes: (userId, range) => queries.getGameTimes(guildId, userId, range),
    getVoiceSessionGroups: (userId, range, limit) =>
      queries.getVoiceSessionGroups(guildId, userId, range, limit),
  };
}

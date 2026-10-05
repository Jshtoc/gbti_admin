import 'server-only';

import * as queries from '@gbti/db';

import type { DashboardRepository } from './types';

export function createDbRepository(guildId: string): DashboardRepository {
  return {
    getMembers: () => queries.getMembers(guildId),
    getMemberActivity: (range) => queries.getMemberActivity(guildId, range),
    getCoPlayPairs: (range, limit) => queries.getCoPlayPairs(guildId, range, limit),
    getPartners: (userId, range, limit) => queries.getPartners(guildId, userId, range, limit),
    getDailyVoice: (range, userId) => queries.getDailyVoice(guildId, range, userId),
    getGameTimes: (userId, range) => queries.getGameTimes(guildId, userId, range),
    getRecentVoiceSessions: (userId, limit) =>
      queries.getRecentVoiceSessions(guildId, userId, limit),
    getRoomCategoryTimes: (range, userId) => queries.getRoomCategoryTimes(guildId, range, userId),
  };
}

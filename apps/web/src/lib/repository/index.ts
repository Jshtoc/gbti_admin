import 'server-only';

import { createDbRepository } from './db';
import { createMockRepository } from './mock';
import type { DashboardRepository } from './types';

let repository: DashboardRepository | undefined;

/** DATA_SOURCE=db 이면 PostgreSQL, 그 외에는 목데이터 */
export function getRepository(): DashboardRepository {
  if (repository) return repository;

  if (process.env.DATA_SOURCE === 'db') {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) throw new Error('DISCORD_GUILD_ID is not set');
    repository = createDbRepository(guildId);
  } else {
    repository = createMockRepository();
  }
  return repository;
}

export type { DashboardRepository } from './types';

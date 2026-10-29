import 'server-only';

import { getRole } from '@/lib/auth/server';

import { createDbRepository } from './db';
import { createMockRepository } from './mock';
import { restrictRepository } from './restricted';
import type { DashboardRepository } from './types';

let repository: DashboardRepository | undefined;

/** 현재 세션에 맞는 데이터 소스. 제한 계정이면 VIEWER_MEMBER_NAME 멤버 한 명만 보인다 */
export async function getRepository(): Promise<DashboardRepository> {
  const base = getBaseRepository();
  const memberName = process.env.VIEWER_MEMBER_NAME;
  if (memberName && (await getRole()) === 'viewer') return restrictRepository(base, memberName);
  return base;
}

/** DATA_SOURCE=db 이면 PostgreSQL, 그 외에는 목데이터 */
function getBaseRepository(): DashboardRepository {
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

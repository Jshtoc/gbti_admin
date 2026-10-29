import 'server-only';

import { getRole } from '@/lib/auth/server';

import { createDbRepository } from './db';
import { createMockRepository } from './mock';
import type { DashboardRepository } from './types';

let repository: DashboardRepository | undefined;
let viewerRepository: DashboardRepository | undefined;

/**
 * 현재 세션에 맞는 데이터 소스. 제한 계정(viewer)은 통계에서 빠져 있는
 * VIEWER_SHOW_USER_ID 멤버가 목록·집계에 함께 보인다 (DATA_SOURCE=db 일 때만)
 */
export async function getRepository(): Promise<DashboardRepository> {
  const showUserId = process.env.VIEWER_SHOW_USER_ID;
  if (process.env.DATA_SOURCE === 'db' && showUserId && (await getRole()) === 'viewer') {
    viewerRepository ??= createDbRepository(getGuildId(), showUserId);
    return viewerRepository;
  }
  return getBaseRepository();
}

function getGuildId(): string {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) throw new Error('DISCORD_GUILD_ID is not set');
  return guildId;
}

/** DATA_SOURCE=db 이면 PostgreSQL, 그 외에는 목데이터 */
function getBaseRepository(): DashboardRepository {
  if (repository) return repository;

  repository = process.env.DATA_SOURCE === 'db' ? createDbRepository(getGuildId()) : createMockRepository();
  return repository;
}

export type { DashboardRepository } from './types';

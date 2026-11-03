import 'server-only';

import { getRole } from '@/lib/auth/server';

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/** 멤버 정보 API는 제한 계정(aro)에서만. 목데이터 모드에서는 DB가 없어 쓸 수 없다 */
export async function guardViewerDb(): Promise<{ guildId: string } | Response> {
  if ((await getRole()) !== 'viewer') return json({ error: '권한이 없습니다.' }, 403);
  const guildId = process.env.DISCORD_GUILD_ID;
  if (process.env.DATA_SOURCE !== 'db' || !guildId) return json({ error: 'DB 모드에서만 사용할 수 있습니다.' }, 400);
  return { guildId };
}

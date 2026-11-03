import { getAllMemberAccounts, upsertMemberAccounts } from '@gbti/db';

import { getRole } from '@/lib/auth/server';
import { formatAccountsTxt, normalizeName, parseAccountsTxt } from '@/lib/memberAccountsTxt';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 1024 * 1024; // 1MB
const json = (body: unknown, status = 200) => Response.json(body, { status });

/** 멤버 정보 업데이트는 제한 계정(aro)에서만. 목데이터 모드에서는 DB가 없어 쓸 수 없다 */
async function guard(): Promise<{ guildId: string } | Response> {
  if ((await getRole()) !== 'viewer') return json({ error: '권한이 없습니다.' }, 403);
  const guildId = process.env.DISCORD_GUILD_ID;
  if (process.env.DATA_SOURCE !== 'db' || !guildId) return json({ error: 'DB 모드에서만 사용할 수 있습니다.' }, 400);
  return { guildId };
}

/** 다운로드: 현재 멤버 전체의 계정 정보 TXT */
export async function GET() {
  const g = await guard();
  if (g instanceof Response) return g;

  const rows = await getAllMemberAccounts(g.guildId, process.env.VIEWER_SHOW_USER_ID);
  const entries = rows
    .map((r) => ({
      name: normalizeName(r.displayName) || r.displayName,
      lolId: r.lolId,
      steamId: r.steamId,
      pubgId: r.pubgId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return new Response('﻿' + formatAccountsTxt(entries), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent('멤버리스트.txt'),
      'Cache-Control': 'no-store',
    },
  });
}

/** 업로드: TXT 내용으로 멤버 계정 정보를 덮어쓴다 (파일에 없는 멤버는 그대로) */
export async function POST(request: Request) {
  const g = await guard();
  if (g instanceof Response) return g;

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('file');
  } catch {
    return json({ error: '파일을 읽을 수 없습니다.' }, 400);
  }
  if (!(file instanceof File)) return json({ error: '파일이 없습니다.' }, 400);
  if (!file.name.toLowerCase().endsWith('.txt')) return json({ error: 'TXT 파일만 올릴 수 있습니다.' }, 400);
  if (file.type && file.type !== 'text/plain') return json({ error: 'TXT 파일만 올릴 수 있습니다.' }, 400);
  if (file.size === 0 || file.size > MAX_BYTES) return json({ error: '파일 크기는 1MB 이하여야 합니다.' }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.includes(0)) return json({ error: 'TXT 파일만 올릴 수 있습니다.' }, 400);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return json({ error: 'UTF-8로 저장된 TXT 파일만 올릴 수 있습니다.' }, 400);
  }

  const { entries, invalidBlocks } = parseAccountsTxt(text);
  if (entries.length === 0) return json({ error: '읽을 수 있는 멤버가 없습니다. 양식을 확인해 주세요.' }, 400);

  // 이름 → 멤버. 같은 이름이 둘 이상이면 누구인지 알 수 없어 건너뛴다
  const byName = new Map<string, string[]>();
  for (const m of await getAllMemberAccounts(g.guildId, process.env.VIEWER_SHOW_USER_ID)) {
    const key = normalizeName(m.displayName);
    byName.set(key, [...(byName.get(key) ?? []), m.userId]);
  }

  const updates = new Map<string, { userId: string; lolId: string; steamId: string; pubgId: string }>();
  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  for (const e of entries) {
    const ids = byName.get(e.name);
    if (!ids) unmatched.push(e.name);
    else if (ids.length > 1) ambiguous.push(e.name);
    else if (ids[0]) updates.set(ids[0], { userId: ids[0], lolId: e.lolId, steamId: e.steamId, pubgId: e.pubgId });
  }

  await upsertMemberAccounts(g.guildId, [...updates.values()]);
  return json({ updated: updates.size, unmatched, ambiguous, invalidBlocks });
}

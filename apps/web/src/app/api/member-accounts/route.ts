import { getAllMemberAccounts } from '@gbti/db';

import { formatAccountsTxt, normalizeName } from '@/lib/memberAccountsTxt';
import { guardViewerDb } from '@/lib/viewerApi';

export const dynamic = 'force-dynamic';

/** 다운로드: 현재 멤버의 계정 정보 TXT (게스트·부계정 등 통계 제외 멤버는 뺌) */
export async function GET() {
  const g = await guardViewerDb();
  if (g instanceof Response) return g;

  const rows = await getAllMemberAccounts(g.guildId, process.env.VIEWER_SHOW_USER_ID);
  const entries = rows
    .map((r) => ({
      name: normalizeName(r.displayName) || r.displayName,
      lolId: r.lolId,
      steamId: r.steamId,
      pubgId: r.pubgId,
      robloxId: r.robloxId,
      overwatchId: r.overwatchId,
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

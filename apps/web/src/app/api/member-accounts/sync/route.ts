import { getAllMemberAccounts, getDepartedMembers, mergeMemberAccounts } from '@gbti/db';

import { baseKey, matchKey, postKey, readThreadPosts, ThreadReadError } from '@/lib/threadAccounts';
import { guardViewerDb, json } from '@/lib/viewerApi';

export const dynamic = 'force-dynamic';

/**
 * 멤버 정보 업데이트: "잡담금" 스레드의 글을 읽어 멤버 계정 정보에 반영한다.
 * 글이 없는 멤버와 비어 있는 항목은 그대로 둔다.
 */
export async function POST() {
  const g = await guardViewerDb();
  if (g instanceof Response) return g;

  const token = process.env.DISCORD_TOKEN;
  if (!token) return json({ error: '서버에 DISCORD_TOKEN이 설정되어 있지 않습니다.' }, 500);

  let posts;
  try {
    posts = await readThreadPosts(token, g.guildId);
  } catch (e) {
    if (e instanceof ThreadReadError) return json({ error: e.message }, 502);
    throw e;
  }
  if (posts.length === 0) return json({ error: '스레드에서 읽을 수 있는 글이 없습니다.' }, 400);

  // 현재 멤버를 먼저, 못 찾으면 서버를 나간 멤버에서 찾는다 (탈퇴 유저 목록에 계정 정보를 채우기 위해)
  const members = await getAllMemberAccounts(g.guildId, process.env.VIEWER_SHOW_USER_ID);
  const departed = await getDepartedMembers(g.guildId);
  const departedIds = new Set(departed.map((m) => m.userId));
  const index = (list: { userId: string; displayName: string }[]) => {
    const exact = new Map<string, string[]>();
    const byBase = new Map<string, string[]>();
    for (const m of list) {
      exact.set(matchKey(m.displayName), [...(exact.get(matchKey(m.displayName)) ?? []), m.userId]);
      byBase.set(baseKey(m.displayName), [...(byBase.get(baseKey(m.displayName)) ?? []), m.userId]);
    }
    // 정확히 같은 이름 우선, 없으면 서버 닉네임 끝 숫자(출생연도)를 뺀 이름과 비교
    return (key: string) => exact.get(key) ?? byBase.get(key);
  };
  const findCurrent = index(members);
  const findDeparted = index(departed);

  const updates = new Map<string, { userId: string; lolId: string; steamId: string; pubgId: string; robloxId: string }>();
  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  for (const p of posts) {
    const key = postKey(p.nick);
    const ids = findCurrent(key) ?? findDeparted(key);
    const userId = ids?.[0];
    if (!ids || !userId) unmatched.push(p.nick);
    else if (ids.length > 1 || updates.has(userId)) ambiguous.push(p.nick);
    else {
      updates.set(userId, {
        userId,
        lolId: p.lolId,
        steamId: p.steamId,
        pubgId: p.pubgId,
        robloxId: p.robloxId,
      });
    }
  }

  await mergeMemberAccounts(g.guildId, [...updates.values()]);

  // 반영 후에도 ID를 하나도 입력하지 않은 멤버 (닉네임의 [] 태그는 뺀다)
  const after = await getAllMemberAccounts(g.guildId, process.env.VIEWER_SHOW_USER_ID);
  const missing = after
    .filter((m) => !m.lolId && !m.steamId && !m.pubgId && !m.robloxId)
    .map((m) => m.displayName.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim() || m.displayName)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const departedUpdated = [...updates.keys()].filter((id) => departedIds.has(id)).length;
  return json({ posts: posts.length, updated: updates.size, departedUpdated, unmatched, ambiguous, missing, total: after.length });
}

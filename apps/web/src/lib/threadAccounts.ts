import 'server-only';

// "잡담금" 스레드에 멤버들이 올린 계정 정보 글을 읽어 멤버 계정 정보로 바꾼다.
// 글 양식: 닉네임 : / 스팀 : / 배그 : / 롤 : / 로블록스 :  (한 줄에 하나)
// 메시지 내용은 DB에 저장하지 않고, 읽어서 추출한 ID만 쓴다.

const DISCORD_API = 'https://discord.com/api/v10';
const THREAD_NAME = '잡담금';
const MAX_PAGES = 20; // 100개씩, 최대 2000개

export interface ThreadPost {
  nick: string;
  lolId: string;
  steamId: string;
  pubgId: string;
}

export class ThreadReadError extends Error {}

async function discord<T>(token: string, path: string): Promise<T> {
  const res = await fetch(DISCORD_API + path, { headers: { Authorization: `Bot ${token}` }, cache: 'no-store' });
  if (res.status === 403) {
    throw new ThreadReadError('봇이 스레드를 볼 권한이 없습니다. 채널의 채널 보기·메시지 기록 보기 권한을 확인해 주세요.');
  }
  if (!res.ok) throw new ThreadReadError(`디스코드 요청에 실패했습니다. (${res.status})`);
  return (await res.json()) as T;
}

/** 값 정리: 앞뒤 공백·보이지 않는 문자 제거, "X", "-" 같은 없음 표시는 빈 값으로 */
function cleanValue(value: string | undefined): string {
  const v = (value ?? '').replace(/[​‌‍﻿]/g, '').trim();
  return /^(x|-|없음|없어요)$/i.test(v) ? '' : v;
}

function parsePost(content: string): ThreadPost | null {
  const fields: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*(닉네임|스팀|배그|롤)\s*[:：]\s*(.*)$/);
    if (m?.[1]) fields[m[1]] = m[2] ?? '';
  }
  const nick = cleanValue(fields['닉네임']);
  if (!nick || !('스팀' in fields)) return null; // 닉네임이 비어 있는 빈 양식 등은 건너뜀
  return {
    nick,
    lolId: cleanValue(fields['롤']),
    steamId: cleanValue(fields['스팀']),
    pubgId: cleanValue(fields['배그']),
  };
}

/** 스레드의 글을 오래된 순으로 읽어 닉네임별 마지막 글만 돌려준다 */
export async function readThreadPosts(token: string, guildId: string): Promise<ThreadPost[]> {
  const active = await discord<{ threads: { id: string; name: string }[] }>(
    token,
    `/guilds/${guildId}/threads/active`,
  );
  const thread = active.threads.find((t) => t.name === THREAD_NAME);
  if (!thread) throw new ThreadReadError(`'${THREAD_NAME}' 스레드를 찾지 못했습니다.`);

  const messages: { id: string; content: string }[] = [];
  let before = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await discord<{ id: string; content: string }[]>(
      token,
      `/channels/${thread.id}/messages?limit=100${before}`,
    );
    messages.push(...batch);
    if (batch.length < 100) break;
    before = `&before=${batch[batch.length - 1]?.id}`;
  }

  // 글이 있는데 내용이 전부 비어 있으면 봇의 Message Content Intent가 꺼진 것
  if (messages.length > 0 && messages.every((m) => !m.content)) {
    throw new ThreadReadError('메시지 내용을 읽지 못했습니다. 디스코드 개발자 포털에서 Message Content Intent를 켜 주세요.');
  }

  const latest = new Map<string, ThreadPost>();
  for (const m of messages.reverse()) {
    const post = parsePost(m.content);
    if (post) latest.set(matchKey(post.nick), post); // 같은 닉네임이 다시 올리면 나중 글로
  }
  return [...latest.values()];
}

/** 닉네임 비교용 키: 대괄호 태그·공백 제거, 소문자 */
export function matchKey(name: string): string {
  return name
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, '')
    .normalize('NFC')
    .toLowerCase();
}

/** 서버 닉네임 끝의 숫자(출생연도)를 뺀 비교 키. 글에는 숫자 없이 적는 경우가 많다 */
export function baseKey(name: string): string {
  return matchKey(name).replace(/\d+$/, '');
}

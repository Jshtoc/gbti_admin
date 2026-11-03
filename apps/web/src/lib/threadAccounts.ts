import 'server-only';

// 멤버들이 올린 계정 정보 글을 읽어 멤버 계정 정보로 바꾼다. 읽는 곳은 두 군데:
//  - "잡담금" 스레드 (기존 멤버): 닉네임 : / 스팀 : / 배그 : / 롤 : / 로블록스 :
//  - "뉴비-정보-기재란" 채널 (새 멤버): 이름 : / 롤 ID : / 스팀 ID : / 배그 ID : / 로블록스 ID :
// 한 줄에 하나씩이고, 두 양식 모두 읽는다. 메시지 내용은 DB에 저장하지 않고 읽어서 추출한 ID만 쓴다.

const DISCORD_API = 'https://discord.com/api/v10';
const THREAD_NAME = '잡담금';
const NEWBIE_CHANNEL_NAME = '뉴비-정보-기재란';
const MAX_PAGES = 20; // 100개씩, 최대 2000개

export interface ThreadPost {
  nick: string;
  lolId: string;
  steamId: string;
  pubgId: string;
  robloxId: string;
}

export class ThreadReadError extends Error {}

async function discord<T>(token: string, path: string, source: string): Promise<T> {
  const res = await fetch(DISCORD_API + path, { headers: { Authorization: `Bot ${token}` }, cache: 'no-store' });
  if (res.status === 403) {
    throw new ThreadReadError(
      `봇이 '${source}'을(를) 볼 권한이 없습니다. 채널의 채널 보기·메시지 기록 보기 권한을 확인해 주세요.`,
    );
  }
  if (!res.ok) throw new ThreadReadError(`디스코드 요청에 실패했습니다. (${source}, ${res.status})`);
  return (await res.json()) as T;
}

/** 값 정리: 앞뒤 공백·보이지 않는 문자 제거, "X", "-" 같은 없음 표시는 빈 값으로 */
function cleanValue(value: string | undefined): string {
  const v = (value ?? '').replace(/[​‌‍﻿]/g, '').trim();
  return /^(x|-|없음|없어요)$/i.test(v) ? '' : v;
}

/** 두 양식을 모두 읽는다: 닉네임/이름, 롤/롤 ID 처럼 뒤에 ID가 붙어도 같은 항목 */
function parsePost(content: string): ThreadPost | null {
  const fields: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*(닉네임|이름|스팀|배그|롤|로블록스)(?:\s*ID)?\s*[:：]\s*(.*)$/i);
    if (m?.[1]) fields[m[1]] = m[2] ?? '';
  }
  const nick = cleanValue(fields['닉네임'] ?? fields['이름']);
  const hasIdField = ['스팀', '배그', '롤', '로블록스'].some((k) => k in fields);
  if (!nick || !hasIdField) return null; // 닉네임이 비어 있는 빈 양식 등은 건너뜀
  return {
    nick,
    lolId: cleanValue(fields['롤']),
    steamId: cleanValue(fields['스팀']),
    pubgId: cleanValue(fields['배그']),
    robloxId: cleanValue(fields['로블록스']),
  };
}

/** 채널(스레드)의 글 내용을 오래된 순으로 읽는다 */
async function readMessages(token: string, channelId: string, source: string): Promise<string[]> {
  const messages: { id: string; content: string }[] = [];
  let before = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await discord<{ id: string; content: string }[]>(
      token,
      `/channels/${channelId}/messages?limit=100${before}`,
      source,
    );
    messages.push(...batch);
    if (batch.length < 100) break;
    before = `&before=${batch[batch.length - 1]?.id}`;
  }

  // 글이 있는데 내용이 전부 비어 있으면 봇의 Message Content Intent가 꺼진 것
  if (messages.length > 0 && messages.every((m) => !m.content)) {
    throw new ThreadReadError('메시지 내용을 읽지 못했습니다. 디스코드 개발자 포털에서 Message Content Intent를 켜 주세요.');
  }
  return messages.reverse().map((m) => m.content);
}

/**
 * 잡담금 스레드(기존 멤버)와 뉴비-정보-기재란 채널(새 멤버)의 글을 읽어 닉네임별 마지막 글만 돌려준다.
 * 같은 닉네임이 양쪽에 있으면 뉴비 채널 글이 우선한다.
 */
export async function readThreadPosts(token: string, guildId: string): Promise<ThreadPost[]> {
  const active = await discord<{ threads: { id: string; name: string }[] }>(
    token,
    `/guilds/${guildId}/threads/active`,
    THREAD_NAME,
  );
  const thread = active.threads.find((t) => t.name === THREAD_NAME);
  if (!thread) throw new ThreadReadError(`'${THREAD_NAME}' 스레드를 찾지 못했습니다.`);

  const channels = await discord<{ id: string; name: string }[]>(
    token,
    `/guilds/${guildId}/channels`,
    NEWBIE_CHANNEL_NAME,
  );
  const newbie = channels.find((c) => c.name === NEWBIE_CHANNEL_NAME);
  if (!newbie) throw new ThreadReadError(`'${NEWBIE_CHANNEL_NAME}' 채널을 찾지 못했습니다.`);

  const contents = [
    ...(await readMessages(token, thread.id, THREAD_NAME)),
    ...(await readMessages(token, newbie.id, NEWBIE_CHANNEL_NAME)),
  ];

  const latest = new Map<string, ThreadPost>();
  for (const content of contents) {
    const post = parsePost(content);
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

/**
 * 글에 적은 닉네임이 서버 닉네임과 달라서 자동으로 못 맞추는 경우의 별칭 (글의 닉네임 → 서버 닉네임).
 * 키·값 모두 matchKey 형태(공백 없음, 소문자)로 쓴다.
 */
const NICK_ALIASES: Record<string, string> = {
  금쪽92: '금쪽이92',
};

/** 글의 닉네임을 비교 키로 바꾼다 (별칭 적용) */
export function postKey(nick: string): string {
  const key = matchKey(nick);
  return NICK_ALIASES[key] ?? key;
}

/** 서버 닉네임 끝의 숫자(출생연도)를 뺀 비교 키. 글에는 숫자 없이 적는 경우가 많다 */
export function baseKey(name: string): string {
  return matchKey(name).replace(/\d+$/, '');
}

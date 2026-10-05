import type { MemberListItem } from '@gbti/db';

// 멤버 검색: 닉네임/아이디 부분 일치 + 한글 초성 검색 (예: "ㄴㄱ" → "냥구")

const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JAMO_PER_CHOSUNG = 21 * 28;

/** "냥구" → "ㄴㄱ". 한글 음절이 아닌 글자는 그대로 둔다 */
export function toChosung(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    out +=
      code >= HANGUL_START && code <= HANGUL_END ? CHOSUNG[Math.floor((code - HANGUL_START) / JAMO_PER_CHOSUNG)] : ch;
  }
  return out;
}

const isChosungOnly = (text: string) => /^[ㄱ-ㅎ]+$/.test(text);
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '');

export function matchesMember(member: Pick<MemberListItem, 'displayName' | 'username'>, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const name = normalize(member.displayName);
  if (name.includes(q) || normalize(member.username).includes(q)) return true;
  return isChosungOnly(q) && toChosung(name).includes(q);
}

/** 이름이 검색어로 시작하는 멤버를 먼저 보여준다 */
export function searchMembers<T extends Pick<MemberListItem, 'displayName' | 'username'>>(members: T[], query: string): T[] {
  const q = normalize(query);
  if (!q) return members;
  const matched = members.filter((m) => matchesMember(m, q));
  const startsWith = (m: T) =>
    normalize(m.displayName).startsWith(q) || toChosung(normalize(m.displayName)).startsWith(q) ? 0 : 1;
  return matched.sort((a, b) => startsWith(a) - startsWith(b));
}

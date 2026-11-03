// 계정 정보 복사 문구. 멤버 상세 카드와 탈퇴 유저 목록이 같이 쓴다.

export interface AccountIds {
  lolId: string;
  steamId: string;
  pubgId: string;
  robloxId: string;
  overwatchId: string;
}

export const KICK_MESSAGE = '친구삭제 부탁드립니다.\n몰랐습니다 깜박했어요 안됩니다.';

/** 닉네임 앞의 [] 태그를 빼고 공백을 정리한다 */
export function stripNameTag(displayName: string): string {
  return displayName.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim() || displayName;
}

/** 화면 표시·복사 순서 */
export function accountRows(a: AccountIds): [string, string][] {
  return [
    ['롤 ID', a.lolId],
    ['스팀 ID', a.steamId],
    ['배그 ID', a.pubgId],
    ['로블록스 ID', a.robloxId],
    ['오버워치 ID', a.overwatchId],
  ];
}

/** 계정정보 복사: 이름 + 전체 항목 (빈 값도 줄은 남긴다) */
export function buildAccountText(displayName: string, a: AccountIds): string {
  const lines = accountRows(a).map(([label, value]) => `${label} : ${value}`);
  return [`이름 : ${stripNameTag(displayName)}`, ...lines].join('\n');
}

/** 퇴출 복사: 값이 있는 항목만 + 안내 문구 (값이 하나도 없으면 안내 문구만) */
export function buildKickText(a: AccountIds): string {
  const ids = accountRows(a)
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label} : ${value}`)
    .join('\n');
  return ids ? `${ids}\n\n${KICK_MESSAGE}` : KICK_MESSAGE;
}

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

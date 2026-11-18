// 계정 정보 복사 문구. 멤버 상세 카드와 탈퇴 유저 목록이 같이 쓴다.

export interface AccountIds {
  lolId: string;
  steamId: string;
  pubgId: string;
  robloxId: string;
}

export const KICK_MESSAGE = '나간 사람을 알아서 친삭해주세요\n몰랐다 까먹었다 안됩니다\n\n친삭 안한거 적발 시 추방합니다';

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

/** 여러 멤버 계정정보 복사: 멤버마다 이름 + 값이 있는 항목만, 멤버 사이는 빈 줄 */
export function buildAccountTextMany(members: { displayName: string; ids: AccountIds }[]): string {
  return members
    .map(({ displayName, ids }) => {
      const lines = accountRows(ids)
        .filter(([, value]) => value.trim())
        .map(([label, value]) => `${label} : ${value}`);
      // 계정 정보가 하나도 없는 멤버는 표기하지 않는다
      return lines.length > 0 ? [`이름 : ${stripNameTag(displayName)}`, ...lines].join('\n') : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/** 여러 멤버 퇴출 복사: 여러 멤버 계정정보 복사와 같고, 안내 문구만 맨 끝에 한 번 붙인다 */
export function buildKickTextMany(members: { displayName: string; ids: AccountIds }[]): string {
  const body = buildAccountTextMany(members);
  return body ? `${body}\n\n${KICK_MESSAGE}` : KICK_MESSAGE;
}

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

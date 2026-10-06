// 음성 채널(방)의 종류 판정 규칙. 봇(기록 시점)과 목데이터가 같은 함수를 쓴다.
//
// 1. 방 제목에 HANGOUT_KEYWORDS(할하방·할하·할거·각자)가 들어 있으면 → '할하방'
//    띄어쓰기·괄호·기호는 무시한다 (예: "할 (거) 하 (는) 방" → "할거하는방" → '할거' 포함)
// 2. 방 안에서 서로 다른 게임이 2개 이상 보이면 → '할하방' (각자 다른 걸 하는 방)
// 3. 게임이 하나면 → 그 게임 이름
// 4. 아무 정보도 없으면 → '정보미표시방'
//
// 디스코드에서 "활동 상태 표시"를 끈 멤버의 게임은 봇이 받을 수 없다. 방 전원이 꺼두면 4번이 된다.
// 봇은 방 인원 또는 방 안 멤버의 게임 상태가 바뀔 때마다 이 함수로 다시 판정하고,
// 결과가 바뀌면 voice_room_states의 현재 구간을 닫고 새 구간을 연다.

/**
 * 게임 이름 별칭. 같은 게임이 런처·클라이언트 언어에 따라 다른 이름으로 오는 것을 하나로 묶는다. 키는 소문자로.
 * (같은 게임이 두 이름으로 남으면 2번 규칙에서 "여러 게임"으로 잘못 판정된다)
 * 봇이 기록할 때 적용되므로, 여기를 바꾸면 이미 쌓인 기록은 DB에서 따로 고쳐야 한다.
 */
const GAME_ALIASES: Record<string, string> = {
  modrinth: 'Minecraft', // 마인크래프트 모드 런처
  '리그 오브 레전드': 'League of Legends', // 한국어 클라이언트
};

export function normalizeGameName(name: string): string {
  const trimmed = name.trim();
  return GAME_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export const HANGOUT_KEYWORDS = ['할하방', '할하', '할거', '각자'] as const;
export const HANGOUT_LABEL = '할하방';
export const UNKNOWN_LABEL = '정보미표시방';

/** hangout = 할하방 (방 제목 키워드 또는 여러 게임) */
export type RoomCategoryKind = 'hangout' | 'game' | 'unknown';

export interface RoomCategory {
  kind: RoomCategoryKind;
  label: string;
}

/** 키워드 비교용 방 제목: 한글·영문·숫자만 남긴다 */
export function normalizeRoomTitle(channelName: string): string {
  return channelName.replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
}

/**
 * @param channelName 현재 방 제목
 * @param games 방에 있는 멤버들의 "게임 중" 활동 이름 (게임 상태가 보이는 멤버만, 1인 1개)
 */
export function classifyRoom(channelName: string, games: string[]): RoomCategory {
  const title = normalizeRoomTitle(channelName);
  if (HANGOUT_KEYWORDS.some((keyword) => title.includes(keyword))) {
    return { kind: 'hangout', label: HANGOUT_LABEL };
  }

  const distinct = new Set(games.map(normalizeGameName).filter(Boolean));
  if (distinct.size >= 2) return { kind: 'hangout', label: HANGOUT_LABEL };
  if (distinct.size === 1) return { kind: 'game', label: [...distinct][0]! };
  return { kind: 'unknown', label: UNKNOWN_LABEL };
}

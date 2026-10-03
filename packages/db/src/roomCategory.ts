// 음성 채널(방)의 종류 판정 규칙. 봇(기록 시점)과 목데이터가 같은 함수를 쓴다.
//
// 1. 방 제목에 HANGOUT_KEYWORDS 중 하나라도 들어 있으면 → '할하방' (게임 여부와 무관, 최우선)
// 2. 방에 있는 멤버 중 한 명이라도 "게임 중" 상태가 보이면 → 그 게임 이름
//    (여러 게임이면 하는 사람이 가장 많은 게임, 동률이면 직전 판정을 유지, 그래도 없으면 이름순)
// 3. 아무 정보도 없으면 → '정보미표시방'
//
// 디스코드에서 "활동 상태 표시"를 끈 멤버의 게임은 봇이 받을 수 없다. 방 전원이 꺼두면 3번이 된다.
// 봇은 방 인원 또는 방 안 멤버의 게임 상태가 바뀔 때마다 이 함수로 다시 판정하고,
// 결과가 바뀌면 voice_room_states의 현재 구간을 닫고 새 구간을 연다.

export const HANGOUT_KEYWORDS = ['할하방', '할거', '각자'] as const;
export const HANGOUT_LABEL = '할하방';
export const UNKNOWN_LABEL = '정보미표시방';

export type RoomCategoryKind = 'keyword' | 'game' | 'unknown';

export interface RoomCategory {
  kind: RoomCategoryKind;
  label: string;
}

/**
 * @param channelName 현재 방 제목
 * @param games 방에 있는 멤버들의 "게임 중" 활동 이름 (게임 상태가 보이는 멤버만, 1인 1개)
 * @param previousLabel 직전 판정 결과 (동률일 때 깜빡임 방지용)
 */
export function classifyRoom(channelName: string, games: string[], previousLabel?: string): RoomCategory {
  if (HANGOUT_KEYWORDS.some((keyword) => channelName.includes(keyword))) {
    return { kind: 'keyword', label: HANGOUT_LABEL };
  }

  const counts = new Map<string, number>();
  for (const game of games) {
    const name = game.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (counts.size === 0) return { kind: 'unknown', label: UNKNOWN_LABEL };

  const top = Math.max(...counts.values());
  const tied = [...counts].filter(([, n]) => n === top).map(([name]) => name);
  const label =
    previousLabel && tied.includes(previousLabel) ? previousLabel : tied.sort((a, b) => a.localeCompare(b))[0]!;
  return { kind: 'game', label };
}

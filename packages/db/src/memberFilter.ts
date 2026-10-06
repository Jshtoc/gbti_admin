// 통계에서 빼는 멤버: 닉네임에 아래 태그가 들어간 계정 (게스트·부계정).
// 봇은 이들의 활동도 그대로 기록한다 — 닉네임에서 태그가 빠지면 다시 통계에 나온다.
// SQL(queries.ts)과 목데이터(mock.ts)가 같은 규칙을 쓴다.

export const EXCLUDED_NAME_TAGS = ['[게스트]', '[부계정]'] as const;

export function isExcludedFromStats(displayName: string): boolean {
  return EXCLUDED_NAME_TAGS.some((tag) => displayName.includes(tag));
}

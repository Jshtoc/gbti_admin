import type { DateRange } from '@gbti/db';

// 서버는 한국 서버 기준으로 집계한다. KST는 서머타임이 없어 고정 오프셋으로 충분하다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 주어진 시각이 속한 KST 날짜의 자정(UTC Date) */
export function kstMidnight(date: Date): Date {
  const shifted = date.getTime() + KST_OFFSET_MS;
  return new Date(Math.floor(shifted / DAY_MS) * DAY_MS - KST_OFFSET_MS);
}

/** KST 기준 YYYY-MM-DD */
export function kstDayKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 구간 [start, end)를 range로 잘라낸 길이(초) */
export function clippedSeconds(start: Date, end: Date, range: DateRange): number {
  const s = Math.max(start.getTime(), range.from.getTime());
  const e = Math.min(end.getTime(), range.to.getTime());
  return Math.max(0, (e - s) / 1000);
}

// 대시보드와 같은 기준: 일 단위 집계는 Asia/Seoul 자정 (KST는 서머타임 없음)
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstDayKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

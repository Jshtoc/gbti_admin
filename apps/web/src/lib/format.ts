/** 초 → "12시간 30분" / "45분" */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/** 초 → 소수 1자리 시간 숫자 (KPI 큰 숫자용) */
export function toHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 10_000) return compactFormat.format(hours);
  return hours >= 100 ? Math.round(hours).toLocaleString('ko-KR') : hours.toFixed(1);
}

export function formatCount(n: number): string {
  return n.toLocaleString('ko-KR');
}

const compactFormat = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });

/** KPI 큰 숫자용: 1만 이상은 "1.1만"처럼 줄인다 */
export function formatCompact(n: number): string {
  return n >= 10_000 ? compactFormat.format(n) : formatCount(n);
}

/** 마지막 접속 → "방금", "3시간 전", "12일 전", "기록 없음" */
export function formatLastSeen(date: Date | null, now = new Date()): string {
  if (!date) return '기록 없음';
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 5) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

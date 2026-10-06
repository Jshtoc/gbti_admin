import type { MemberSortKey } from './memberSort';
import type { Period } from './period';

export interface OverviewQuery {
  period: Period;
  sort?: MemberSortKey;
  /** 선택된 멤버 userId. 없으면 서버 전체 */
  member?: string;
}

/** path + 쿼리 파라미터. undefined 값은 생략한다. */
export function withParams(path: string, params: Record<string, string | undefined>, hash?: string): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, value);
  const qs = search.toString();
  return `${path}${qs ? `?${qs}` : ''}${hash ? `#${hash}` : ''}`;
}

/** 기간만 유지한 쿼리 (멤버 상세 등 다른 페이지로 넘어갈 때) */
export function periodHref(path: string, period: Period, hash?: string): string {
  return withParams(path, { from: period.from, to: period.to, time: timeParam(period) }, hash);
}

/** 시간대 필터 쿼리 값 (전체 시간이면 생략) */
export const timeParam = (period: Period) => (period.night ? 'night' : undefined);

/** 개요 페이지 URL. 필터끼리 서로의 값을 잃지 않도록 한 곳에서 만든다. 기본값은 생략. */
export function overviewHref({ period, sort, member }: OverviewQuery, hash?: string): string {
  return withParams(
    '/',
    { from: period.from, to: period.to, time: timeParam(period), sort: sort && sort !== 'voice' ? sort : undefined, member },
    hash,
  );
}

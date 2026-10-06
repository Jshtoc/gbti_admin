import { z } from 'zod';

import type { DateRange } from '@gbti/db';
import { RETENTION_DAYS } from '@gbti/db/retention';

import { DAY_MS, kstDayKey } from './time';

// 조회 기간 = KST 날짜 [from, to] (양 끝 포함). URL에는 ?from=YYYY-MM-DD&to=YYYY-MM-DD 로 둔다.
// 시간대 필터: ?time=night 이면 매일 20:00 ~ 다음날 03:00 (KST)만 집계한다.

export interface Period {
  from: string;
  to: string;
  /** true 면 매일 NIGHT_START_HOUR ~ 다음날 NIGHT_END_HOUR 시만 집계 */
  night?: boolean;
}

export const NIGHT_START_HOUR = 20;
/** 다음날 기준 */
export const NIGHT_END_HOUR = 3;
export const NIGHT_LABEL = `${NIGHT_START_HOUR}~${String(NIGHT_END_HOUR).padStart(2, '0')}시`;

export const PERIOD_PRESETS = [
  { key: '1d', days: 1, label: '1일' },
  { key: '3d', days: 3, label: '3일' },
  { key: '7d', days: 7, label: '7일' },
  { key: '30d', days: 30, label: '30일' },
] as const;

export type PresetKey = (typeof PERIOD_PRESETS)[number]['key'];

const DEFAULT_PRESET_DAYS = 7;
/** 기록 보관 기간(30일)보다 오래 전은 지워져 있으므로 그 안에서만 고른다 */
export const MAX_PERIOD_DAYS = RETENTION_DAYS;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 날짜 문자열 → 그 날 KST 자정 (UTC Date) */
export function kstDateStart(day: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) - KST_OFFSET_MS);
}

export function addDays(day: string, days: number): string {
  return kstDayKey(new Date(kstDateStart(day).getTime() + days * DAY_MS));
}

export function diffDays(from: string, to: string): number {
  return Math.round((kstDateStart(to).getTime() - kstDateStart(from).getTime()) / DAY_MS);
}

/** 오늘을 끝으로 하는 최근 N일 */
export function presetPeriod(days: number, now = new Date()): Period {
  const to = kstDayKey(now);
  return { from: addDays(to, -(days - 1)), to };
}

function firstValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

/** searchParams의 from/to를 검증한다. 잘못되면 최근 7일. 미래 날짜는 오늘로 자르고 순서가 뒤집히면 바꾼다. */
export function parsePeriod(params: Record<string, unknown>, now = new Date()): Period {
  const dates = parsePeriodDates(params, now);
  return firstValue(params.time) === 'night' ? { ...dates, night: true } : dates;
}

function parsePeriodDates(params: Record<string, unknown>, now: Date): Period {
  const from = dateSchema.safeParse(firstValue(params.from));
  const to = dateSchema.safeParse(firstValue(params.to));
  if (!from.success || !to.success || Number.isNaN(kstDateStart(from.data).getTime())) {
    return presetPeriod(DEFAULT_PRESET_DAYS, now);
  }
  // 2026-02-31 처럼 없는 날짜는 Date가 다음 달로 넘기므로 왕복 비교로 거른다
  if (kstDayKey(kstDateStart(from.data)) !== from.data || kstDayKey(kstDateStart(to.data)) !== to.data) {
    return presetPeriod(DEFAULT_PRESET_DAYS, now);
  }

  const today = kstDayKey(now);
  let [start, end] = from.data <= to.data ? [from.data, to.data] : [to.data, from.data];
  if (end > today) end = today;
  if (start > end) start = end;
  // 보관 기간보다 오래된 날은 기록이 지워져 있다: 전부 그 이전이면 기본값, 일부면 보관 시작일로 당긴다
  const oldestDay = addDays(today, -(MAX_PERIOD_DAYS - 1));
  if (end < oldestDay) return presetPeriod(DEFAULT_PRESET_DAYS, now);
  if (start < oldestDay) start = oldestDay;
  return { from: start, to: end };
}

/** 집계용 구간 [from 자정, to 다음날 자정) — 단 오늘이 끝이면 현재 시각까지 */
export function toDateRange(period: Period, now = new Date()): DateRange {
  if (period.night) return nightDateRange(period, now);
  const end = new Date(kstDateStart(period.to).getTime() + DAY_MS);
  return { from: kstDateStart(period.from), to: end > now ? now : end };
}

/**
 * 매일 20:00 ~ 다음날 03:00 구간들. 기간의 마지막 날 밤이 자정을 넘어도 그 밤 전체를 포함하고,
 * 아직 오지 않은 시각은 잘라낸다.
 */
function nightDateRange(period: Period, now: Date): DateRange {
  const windows: { from: Date; to: Date }[] = [];
  for (let day = period.from; day <= period.to; day = addDays(day, 1)) {
    const start = kstDateStart(day).getTime();
    const from = new Date(start + NIGHT_START_HOUR * 60 * 60 * 1000);
    const end = new Date(start + (24 + NIGHT_END_HOUR) * 60 * 60 * 1000);
    if (from >= now) break;
    windows.push({ from, to: end > now ? now : end });
  }
  const first = windows[0];
  const last = windows.at(-1);
  // 구간이 하나도 없으면(오늘 밤이 아직 안 옴) 길이 0 범위
  const empty = new Date(kstDateStart(period.from).getTime() + NIGHT_START_HOUR * 60 * 60 * 1000);
  return { from: first?.from ?? empty, to: last?.to ?? empty, windows };
}

export function periodDays(period: Period): number {
  return diffDays(period.from, period.to) + 1;
}

/** 현재 기간이 프리셋(오늘 기준 최근 N일)과 같으면 그 키 */
export function activePreset(period: Period, now = new Date()): PresetKey | undefined {
  return PERIOD_PRESETS.find((p) => {
    const preset = presetPeriod(p.days, now);
    return preset.from === period.from && preset.to === period.to;
  })?.key;
}

const shortDate = (day: string) => {
  const [, m, d] = day.split('-').map(Number);
  return `${m}.${d}`;
};

/** "2026.9.27 – 10.3" / 하루면 "2026.10.3" */
export function periodLabel(period: Period): string {
  const year = period.from.slice(0, 4);
  if (period.from === period.to) return `${year}.${shortDate(period.from)}`;
  const toYear = period.to.slice(0, 4);
  return `${year}.${shortDate(period.from)} – ${toYear !== year ? `${toYear}.` : ''}${shortDate(period.to)}`;
}

/** KPI 캡션 등에 쓰는 짧은 기간 표현: "7일간" / "오늘" */
export function periodSpanLabel(period: Period, now = new Date()): string {
  const days = periodDays(period);
  const span = days === 1 && period.to === kstDayKey(now) ? '오늘' : `${days}일간`;
  return period.night ? `${span} · ${NIGHT_LABEL}` : span;
}


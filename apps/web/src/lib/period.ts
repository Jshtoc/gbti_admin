import { z } from 'zod';

import type { DateRange } from '@gbti/db';

import { DAY_MS, kstDayKey } from './time';

// 조회 기간 = KST 날짜 [from, to] (양 끝 포함). URL에는 ?from=YYYY-MM-DD&to=YYYY-MM-DD 로 둔다.

export interface Period {
  from: string;
  to: string;
}

export const PERIOD_PRESETS = [
  { key: '1d', days: 1, label: '1일' },
  { key: '3d', days: 3, label: '3일' },
  { key: '7d', days: 7, label: '7일' },
  { key: '30d', days: 30, label: '30일' },
] as const;

export type PresetKey = (typeof PERIOD_PRESETS)[number]['key'];

const DEFAULT_PRESET_DAYS = 7;
/** 너무 긴 기간 조회로 DB에 부담을 주지 않도록 최대 1년 */
export const MAX_PERIOD_DAYS = 366;

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
  if (diffDays(start, end) + 1 > MAX_PERIOD_DAYS) start = addDays(end, -(MAX_PERIOD_DAYS - 1));
  return { from: start, to: end };
}

/** 집계용 구간 [from 자정, to 다음날 자정) — 단 오늘이 끝이면 현재 시각까지 */
export function toDateRange(period: Period, now = new Date()): DateRange {
  const end = new Date(kstDateStart(period.to).getTime() + DAY_MS);
  return { from: kstDateStart(period.from), to: end > now ? now : end };
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
  if (days === 1 && period.to === kstDayKey(now)) return '오늘';
  return `${days}일간`;
}

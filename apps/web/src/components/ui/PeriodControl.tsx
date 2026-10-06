import Link from 'next/link';

import { LinkPending } from '@/components/ui/LinkPending';
import { timeParam, withParams } from '@/lib/overviewQuery';
import { activePreset, MAX_PERIOD_DAYS, NIGHT_LABEL, PERIOD_PRESETS, presetPeriod, type Period } from '@/lib/period';
import { kstDayKey } from '@/lib/time';

import { DateRangePicker } from './DateRangePicker';
import styles from './PeriodControl.module.css';

interface PeriodControlProps {
  period: Period;
  basePath: string;
  /** 기간 외에 유지할 쿼리 (멤버, 정렬 등) */
  params?: Record<string, string | undefined>;
}

/** 프리셋(오늘 기준 최근 N일) 버튼 + 시간대(전체 / 20~03시) + 달력으로 직접 고르는 기간 */
export function PeriodControl({ period, basePath, params = {} }: PeriodControlProps) {
  const now = new Date();
  const today = kstDayKey(now);
  const current = activePreset(period, now);
  // 기간을 바꿔도 시간대 필터는 유지
  const keep = { ...params, time: timeParam(period) };
  const hrefFor = (p: Period) => withParams(basePath, { ...keep, from: p.from, to: p.to });
  const timeHref = (night: boolean) =>
    withParams(basePath, { ...params, from: period.from, to: period.to, time: night ? 'night' : undefined });

  return (
    <div className={styles.control}>
      <nav className={styles.tabs} aria-label="빠른 기간 선택">
        {PERIOD_PRESETS.map((preset) => (
          <Link
            key={preset.key}
            href={hrefFor(presetPeriod(preset.days, now))}
            className={styles.tab}
            aria-current={preset.key === current ? 'page' : undefined}
            scroll={false}
          >
            {preset.label}
            <LinkPending size={10} />
          </Link>
        ))}
      </nav>
      <nav className={styles.tabs} aria-label="집계 시간대">
        {[
          { night: false, label: '전체' },
          { night: true, label: NIGHT_LABEL },
        ].map((option) => (
          <Link
            key={option.label}
            href={timeHref(option.night)}
            className={styles.tab}
            aria-current={Boolean(period.night) === option.night ? 'page' : undefined}
            scroll={false}
          >
            {option.label}
            <LinkPending size={10} />
          </Link>
        ))}
      </nav>
      <DateRangePicker
        period={period}
        today={today}
        maxDays={MAX_PERIOD_DAYS}
        basePath={basePath}
        params={keep}
        isCustom={current === undefined}
      />
    </div>
  );
}

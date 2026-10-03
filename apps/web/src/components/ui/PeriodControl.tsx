import Link from 'next/link';

import { withParams } from '@/lib/overviewQuery';
import { activePreset, MAX_PERIOD_DAYS, PERIOD_PRESETS, presetPeriod, type Period } from '@/lib/period';
import { kstDayKey } from '@/lib/time';

import { DateRangePicker } from './DateRangePicker';
import styles from './PeriodControl.module.css';

interface PeriodControlProps {
  period: Period;
  basePath: string;
  /** 기간 외에 유지할 쿼리 (멤버, 정렬 등) */
  params?: Record<string, string | undefined>;
}

/** 프리셋(오늘 기준 최근 N일) 버튼 + 달력으로 직접 고르는 기간 */
export function PeriodControl({ period, basePath, params = {} }: PeriodControlProps) {
  const now = new Date();
  const today = kstDayKey(now);
  const current = activePreset(period, now);
  const hrefFor = (p: Period) => withParams(basePath, { ...params, from: p.from, to: p.to });

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
          </Link>
        ))}
      </nav>
      <DateRangePicker
        period={period}
        today={today}
        maxDays={MAX_PERIOD_DAYS}
        basePath={basePath}
        params={params}
        isCustom={current === undefined}
      />
    </div>
  );
}

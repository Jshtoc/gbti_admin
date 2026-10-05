'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { withParams } from '@/lib/overviewQuery';
import { addDays, diffDays, periodLabel, type Period } from '@/lib/period';

import styles from './DateRangePicker.module.css';
import { Spinner } from './Spinner';

interface DateRangePickerProps {
  period: Period;
  /** KST 오늘 (YYYY-MM-DD). 이후 날짜는 고를 수 없다 */
  today: string;
  maxDays: number;
  basePath: string;
  params: Record<string, string | undefined>;
  /** 프리셋이 아닌 직접 고른 기간이면 버튼을 강조한다 */
  isCustom: boolean;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Month {
  year: number;
  month: number; // 1-12
}

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const monthOf = (day: string): Month => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) });
const shiftMonth = ({ year, month }: Month, delta: number): Month => {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};
const monthKey = ({ year, month }: Month) => year * 12 + month;

/** 해당 월 달력 칸 (앞쪽 빈칸은 null) */
function monthCells({ year, month }: Month): (string | null)[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toKey(year, month, d));
  return cells;
}

export function DateRangePicker({ period, today, maxDays, basePath, params, isCustom }: DateRangePickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Month>(() => monthOf(period.to));
  const [start, setStart] = useState<string>(period.from);
  const [end, setEnd] = useState<string | null>(period.to);
  const [hover, setHover] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  const minDay = addDays(today, -(maxDays - 1));

  const openPicker = () => {
    setStart(period.from);
    setEnd(period.to);
    setHover(null);
    setView(monthOf(period.to));
    setOpen(true);
  };

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  // 바깥 클릭 / Esc로 닫기
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // 열리면 시작일(또는 첫 선택 가능한 날)에 포커스
  useEffect(() => {
    if (!open) return;
    const target =
      rootRef.current?.querySelector<HTMLButtonElement>('[data-start="true"]') ??
      rootRef.current?.querySelector<HTMLButtonElement>('button[data-day]:not(:disabled)');
    target?.focus();
  }, [open]);

  /** 첫 클릭 = 시작일, 두 번째 클릭 = 끝일(시작보다 앞이면 서로 바꿈). 범위가 이미 있으면 새로 시작 */
  const pick = (day: string) => {
    if (end !== null) {
      setStart(day);
      setEnd(null);
    } else if (day < start) {
      setEnd(start);
      setStart(day);
    } else {
      setEnd(day);
    }
  };

  const previewEnd = end ?? (hover && hover >= start ? hover : start);
  const draft: Period = { from: start, to: end ?? start };
  const tooLong = diffDays(start, previewEnd) + 1 > maxDays;

  const apply = () => {
    const target = withParams(basePath, { ...params, from: draft.from, to: draft.to });
    close();
    startTransition(() => router.push(target, { scroll: false }));
  };

  const canPrev = monthKey(shiftMonth(view, -1)) >= monthKey(monthOf(minDay));
  const canNext = monthKey(shiftMonth(view, 1)) <= monthKey(monthOf(today));

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        data-custom={isCustom || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-busy={isPending}
        onClick={() => (open ? close() : openPicker())}
      >
        {isPending ? (
          <Spinner size={14} label="선택한 기간을 불러오는 중" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1.5 6H12.5M4.5 1V3.5M9.5 1V3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
        <span className={styles.triggerText}>{periodLabel(period)}</span>
      </button>

      {open && (
        <div id={dialogId} className={styles.popover} role="dialog" aria-label="조회 기간 선택">
          <div className={styles.header}>
            <button
              type="button"
              className={styles.nav}
              onClick={() => setView((v) => shiftMonth(v, -1))}
              disabled={!canPrev}
              aria-label="이전 달"
            >
              ‹
            </button>
            <p className={styles.month} aria-live="polite">
              {view.year}년 {view.month}월
            </p>
            <button
              type="button"
              className={styles.nav}
              onClick={() => setView((v) => shiftMonth(v, 1))}
              disabled={!canNext}
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          <div className={styles.grid} role="grid" onMouseLeave={() => setHover(null)}>
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={styles.weekday} data-sunday={i === 0 || undefined} role="columnheader">
                {w}
              </span>
            ))}
            {monthCells(view).map((day, i) => {
              if (!day) return <span key={`empty-${i}`} aria-hidden="true" />;
              const disabled = day > today || day < minDay;
              const isStart = day === start;
              const isEnd = day === previewEnd;
              const inRange = day > start && day < previewEnd;
              return (
                <button
                  key={day}
                  type="button"
                  className={styles.day}
                  data-day={day}
                  data-start={isStart || undefined}
                  data-end={isEnd || undefined}
                  data-in-range={inRange || undefined}
                  data-today={day === today || undefined}
                  disabled={disabled}
                  aria-pressed={isStart || isEnd || inRange}
                  aria-label={`${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일${day === today ? ' (오늘)' : ''}`}
                  onClick={() => pick(day)}
                  onMouseEnter={() => setHover(day)}
                  onFocus={() => setHover(day)}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <p className={styles.summary} data-error={tooLong || undefined}>
              {tooLong
                ? `최대 ${maxDays}일까지 조회할 수 있습니다`
                : end === null
                  ? '끝 날짜를 고르세요 (같은 날을 누르면 하루)'
                  : `${periodLabel(draft)} · ${diffDays(draft.from, draft.to) + 1}일`}
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={() => close()}>
                취소
              </button>
              <button type="button" className={styles.apply} onClick={apply} disabled={end === null || tooLong}>
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

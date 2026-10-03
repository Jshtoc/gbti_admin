'use client';

import { useEffect, useRef, useState } from 'react';

import type { DailyVoice } from '@gbti/db';

import { formatDuration } from '@/lib/format';

import styles from './DailyVoiceChart.module.css';

interface DailyVoiceChartProps {
  data: DailyVoice[];
  /** 스크린리더용 표 캡션 */
  caption: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dayLabel(day: string, withWeekday = false): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const base = `${m}.${d}`;
  if (!withWeekday) return base;
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

/** 축 눈금: 최대값을 덮는 1·2·5 단위 깔끔한 시간 간격, 최대 4칸 */
function niceTicks(maxHours: number): number[] {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  const step = steps.find((s) => maxHours / s <= 4) ?? 1000;
  const top = Math.max(step, Math.ceil(maxHours / step) * step);
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return ticks;
}

export function DailyVoiceChart({ data, caption }: DailyVoiceChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // 모바일에서 가로 스크롤이 생기면 가장 최근 날짜(오른쪽 끝)부터 보여준다
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data.length]);

  const maxSeconds = Math.max(0, ...data.map((d) => d.seconds));
  const ticks = niceTicks(maxSeconds / 3600);
  const topSeconds = (ticks.at(-1) ?? 1) * 3600;
  const peakIndex = maxSeconds > 0 ? data.findIndex((d) => d.seconds === maxSeconds) : -1;
  const labelEvery = Math.ceil(data.length / 7);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setActive((i) => Math.min(data.length - 1, (i ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? data.length) - 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };

  const activeDay = active !== null ? data[active] : undefined;

  const tickBottoms = ticks.map((t) => ({ t, bottom: `${((t * 3600) / topSeconds) * 100}%` }));

  return (
    <figure className={styles.figure}>
      <div className={styles.frame}>
        {/* 모바일에서 가로 스크롤될 때도 고정되는 y축 라벨 */}
        <div className={styles.yAxis} aria-hidden="true">
          <div className={styles.yAxisInner}>
            {tickBottoms.map(({ t, bottom }) => (
              <div key={t} className={styles.tick} style={{ bottom }}>
                <span className={styles.tickLabel}>{t}h</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.scroller} ref={scrollerRef}>
          <div className={styles.canvas} style={{ '--count': data.length } as React.CSSProperties}>
            <div className={styles.plot}>
              <div className={styles.axis} aria-hidden="true">
                {tickBottoms.map(({ t, bottom }) => (
                  <div key={t} className={styles.gridline} style={{ bottom }} />
                ))}
              </div>

              <div
                className={styles.bars}
                data-dense={data.length > 45 || undefined}
                tabIndex={0}
                role="group"
                aria-label={`${caption}. 좌우 화살표로 날짜별 값을 확인할 수 있습니다.`}
                onKeyDown={handleKeyDown}
                onMouseLeave={() => setActive(null)}
                onBlur={() => setActive(null)}
              >
                {data.map((d, i) => (
                  <div
                    key={d.day}
                    className={styles.slot}
                    data-active={i === active || undefined}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setActive(i)}
                  >
                    <div className={styles.bar} style={{ height: `${(d.seconds / topSeconds) * 100}%` }}>
                      {i === peakIndex && active === null && (
                        <span className={styles.peakLabel}>{(d.seconds / 3600).toFixed(1)}h</span>
                      )}
                    </div>
                  </div>
                ))}

                {activeDay && active !== null && (
                  <div
                    className={styles.tooltip}
                    role="status"
                    style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
                    data-edge={active < data.length * 0.15 ? 'start' : active > data.length * 0.85 ? 'end' : undefined}
                  >
                    <span className={styles.tooltipDay}>{dayLabel(activeDay.day, true)}</span>
                    <span className={styles.tooltipValue}>{formatDuration(activeDay.seconds)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.xAxis} aria-hidden="true">
              {data.map((d, i) => (
                <span key={d.day} className={styles.xLabel}>
                  {(i % labelEvery === 0 || i === data.length - 1) && (i === data.length - 1 || data.length - 1 - i >= labelEvery / 2) ? dayLabel(d.day) : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col">음성 체류 시간</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{dayLabel(d.day, true)}</td>
              <td>{formatDuration(d.seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

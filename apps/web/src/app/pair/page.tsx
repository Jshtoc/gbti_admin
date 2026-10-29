import { PairSearch } from '@/components/dashboard/PairSearch';
import pairStyles from '@/components/dashboard/PairSearch.module.css';
import { Avatar } from '@/components/ui/Avatar';
import { PageHero } from '@/components/ui/PageHero';
import { PeriodControl } from '@/components/ui/PeriodControl';
import { StatTile } from '@/components/ui/StatTile';
import { requireSession } from '@/lib/auth/server';
import { formatDuration, toHours } from '@/lib/format';
import { NIGHT_LABEL, parsePeriod, periodLabel, toDateRange } from '@/lib/period';
import { getRepository } from '@/lib/repository';

import styles from '../dashboard.module.css';

// 기록은 계속 쌓이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

interface PairPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** 각자의 음성 시간 중 함께한 비율 (%). 음성 기록이 없으면 0 */
const sharePercent = (shared: number, total: number) => (total > 0 ? Math.min(100, (shared / total) * 100) : 0);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function PairPage({ searchParams }: PairPageProps) {
  await requireSession();
  const query = await searchParams;
  const period = parsePeriod(query);
  const repo = await getRepository();

  const members = await repo.getMembers();
  // 목록에 없는 아이디는 선택 안 한 것으로 본다
  const known = (id: string | undefined) => (id && members.some((m) => m.userId === id) ? id : undefined);
  const a = known(first(query.a));
  const b = known(first(query.b));
  const pair = a && b && a !== b ? await repo.getPairTime(a, b, toDateRange(period)) : null;

  return (
    <div className="container">
      <PageHero
        eyebrow="Pair search"
        title="끼리끼리 검색기"
        description={`${periodLabel(period)}${period.night ? ` · 매일 ${NIGHT_LABEL}만` : ''} · 두 멤버가 같은 음성 채널에 함께 있던 시간`}
        aside={<PeriodControl period={period} basePath="/pair" params={{ a, b }} />}
      />
      <section className={styles.section}>
        <PairSearch members={members} period={period} a={a} b={b} />
      </section>
      {a && b && a !== b && (
        <section className={styles.section} aria-live="polite">
          {pair ? (
            <div className={pairStyles.results}>
              <StatTile
                highlight
                label="끼리끼리 플레이 타임"
                value={toHours(pair.seconds)}
                unit="시간"
                caption={
                  <>
                    <Avatar name={pair.a.displayName} src={pair.a.avatarUrl} size="sm" /> {pair.a.displayName} &amp;{' '}
                    <Avatar name={pair.b.displayName} src={pair.b.avatarUrl} size="sm" /> {pair.b.displayName}
                    {pair.seconds > 0 ? ` · ${formatDuration(pair.seconds)}` : ' · 함께한 기록 없음'}
                  </>
                }
              />
              <div className={pairStyles.shares}>
              {[
                { label: '1번째 멤버', who: pair.a, total: pair.aVoiceSeconds },
                { label: '2번째 멤버', who: pair.b, total: pair.bVoiceSeconds },
              ].map(({ label, who, total }) => (
                <StatTile
                  key={who.userId}
                  label={`${label} 플레이 타임 중 끼리끼리`}
                  value={sharePercent(pair.seconds, total).toFixed(1)}
                  unit="%"
                  caption={
                    <>
                      <Avatar name={who.displayName} src={who.avatarUrl} size="sm" /> {who.displayName} · 전체{' '}
                      {formatDuration(total)} 중 {formatDuration(pair.seconds)}
                    </>
                  }
                />
              ))}
              </div>
            </div>
          ) : (
            <p>이 두 멤버는 통계에서 제외되어 조회할 수 없습니다.</p>
          )}
        </section>
      )}
    </div>
  );
}

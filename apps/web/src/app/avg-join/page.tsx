import { FIRST_JOIN_DAY_START_HOUR, FIRST_JOIN_DAYS } from '@gbti/db';

import { AvgJoinList, type AvgJoinRow } from '@/components/dashboard/AvgJoinList';
import { PageHero } from '@/components/ui/PageHero';
import { requireSession } from '@/lib/auth/server';
import { getRepository } from '@/lib/repository';

import styles from '../dashboard.module.css';

// 기록은 계속 쌓이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

export default async function AvgJoinPage() {
  await requireSession();
  const members = await (await getRepository()).getAverageFirstJoins();

  // 하루 기준(06:00)으로 이른 순 → 기록 없음. 같으면 이름순
  const dayStartSec = FIRST_JOIN_DAY_START_HOUR * 3600;
  const rank = (m: (typeof members)[number]) =>
    m.avgSecondOfDay === null ? Infinity : (m.avgSecondOfDay - dayStartSec + 86400) % 86400;
  const rows: AvgJoinRow[] = members
    .sort((a, b) => rank(a) - rank(b) || a.displayName.localeCompare(b.displayName, 'ko'))
    .map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      username: m.username,
      avatarUrl: m.avatarUrl,
      avgSecondOfDay: m.avgSecondOfDay,
      days: m.days,
    }));

  return (
    <div className="container">
      <PageHero
        eyebrow="Average first join"
        title="평균 접속 시간대"
        description={`매일 첫 음성방 입장 시각의 최근 ${FIRST_JOIN_DAYS}일 평균 · 하루는 새벽 ${FIRST_JOIN_DAY_START_HOUR}시 기준`}
      />
      <section className={styles.section}>
        <AvgJoinList rows={rows} days={FIRST_JOIN_DAYS} />
      </section>
    </div>
  );
}

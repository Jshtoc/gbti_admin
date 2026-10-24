import { IdleList, type IdleRow } from '@/components/dashboard/IdleList';
import { PageHero } from '@/components/ui/PageHero';
import { PeriodControl } from '@/components/ui/PeriodControl';
import { requireSession } from '@/lib/auth/server';
import { NIGHT_LABEL, parsePeriod, periodLabel, toDateRange } from '@/lib/period';
import { getRepository } from '@/lib/repository';

import styles from '../dashboard.module.css';

// 기록은 계속 쌓이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

interface IdlePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function IdlePage({ searchParams }: IdlePageProps) {
  await requireSession();
  const period = parsePeriod(await searchParams);
  const members = await getRepository().getMemberIdle(toDateRange(period));

  // 잠수 시간 많은 순 → 음성 기록 없는 멤버는 맨 뒤. 같으면 이름순
  const rows: IdleRow[] = members
    .sort(
      (a, b) =>
        Number(b.voiceSeconds > 0) - Number(a.voiceSeconds > 0) ||
        b.idleSeconds - a.idleSeconds ||
        a.displayName.localeCompare(b.displayName, 'ko'),
    )
    .map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      username: m.username,
      avatarUrl: m.avatarUrl,
      voiceSeconds: m.voiceSeconds,
      idleSeconds: m.idleSeconds,
    }));

  return (
    <div className="container">
      <PageHero
        eyebrow="Mic-off time"
        title="잠수 시간"
        description={`${periodLabel(period)}${period.night ? ` · 매일 ${NIGHT_LABEL}만` : ''} · 음성방에서 마이크를 끈 시간(본인 음소거·소리 끔·관리자 음소거)과 전체 음성 시간 대비 비율`}
        aside={<PeriodControl period={period} basePath="/idle" />}
      />
      <section className={styles.section}>
        <IdleList rows={rows} />
      </section>
    </div>
  );
}

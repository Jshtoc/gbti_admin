import { LastSeenList, type LastSeenRow } from '@/components/dashboard/LastSeenList';
import { PageHero } from '@/components/ui/PageHero';
import { requireSession } from '@/lib/auth/server';
import { getRepository } from '@/lib/repository';

import styles from '../dashboard.module.css';

// 기록은 계속 쌓이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

export default async function LastSeenPage() {
  await requireSession();
  const members = await getRepository().getLastVoiceExits();

  // 지금 음성 중 → 최근에 나간 순 → 기록 없음. 같으면 이름순
  const rank = (m: (typeof members)[number]) => (m.inVoice ? Infinity : (m.lastLeftAt?.getTime() ?? -Infinity));
  const rows: LastSeenRow[] = members
    .sort((a, b) => rank(b) - rank(a) || a.displayName.localeCompare(b.displayName, 'ko'))
    .map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      username: m.username,
      avatarUrl: m.avatarUrl,
      leftAtMs: m.lastLeftAt?.getTime() ?? null,
      inVoice: m.inVoice,
      channelName: m.lastChannelName,
    }));

  return (
    <div className="container">
      <PageHero
        eyebrow="Last voice exit"
        title="마지막 접속 기록"
        description="멤버별로 마지막에 음성방을 나간 시간 · 최근 30일 기록 기준"
      />
      <section className={styles.section}>
        <LastSeenList rows={rows} nowMs={Date.now()} />
      </section>
    </div>
  );
}

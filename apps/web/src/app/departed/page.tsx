import { DepartedList, type DepartedRow } from '@/components/dashboard/DepartedList';
import { PageHero } from '@/components/ui/PageHero';
import { requireFullAccess } from '@/lib/auth/server';
import { getRepository } from '@/lib/repository';

import styles from '../dashboard.module.css';

// 기록은 계속 쌓이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

export default async function DepartedPage() {
  await requireFullAccess('/departed');
  const members = await (await getRepository()).getDepartedMembers();

  const rows: DepartedRow[] = members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    username: m.username,
    avatarUrl: m.avatarUrl,
    leftAtMs: m.leftAt.getTime(),
    lolId: m.lolId,
    steamId: m.steamId,
    pubgId: m.pubgId,
    robloxId: m.robloxId,
  }));

  return (
    <div className="container">
      <PageHero
        eyebrow="Departed"
        title="탈퇴 유저"
        description="서버를 나간 멤버 · 나간 시각과 계정 정보 · 친구 삭제 요청용 복사 버튼"
      />
      <section className={styles.section}>
        <DepartedList rows={rows} nowMs={Date.now()} />
      </section>
    </div>
  );
}

import { DepartedList, type DepartedRow } from '@/components/dashboard/DepartedList';
import { MemberInfoUpdate } from '@/components/dashboard/MemberInfoUpdate';
import { PageHero } from '@/components/ui/PageHero';
import { getRole, requireSession } from '@/lib/auth/server';
import { getRepository } from '@/lib/repository';

import styles from '../dashboard.module.css';

// 기록은 계속 쌓이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

export default async function DepartedPage() {
  await requireSession('/departed'); // 개요 전용 계정(guest)도 볼 수 있다
  const role = await getRole();
  // 멤버 정보 업데이트(DB 모드, 제한 계정·개요 전용 계정만 — API도 같은 규칙)
  const canUpdate = process.env.DATA_SOURCE === 'db' && (role === 'viewer' || role === 'guest');
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
        {canUpdate && (
          <div style={{ marginBottom: 12 }}>
            <MemberInfoUpdate label="멤버 정보 업데이트" />
          </div>
        )}
        <DepartedList rows={rows} nowMs={Date.now()} />
      </section>
    </div>
  );
}

import { OffUserList, type OffUserRow } from '@/components/dashboard/OffUserList';
import { PageHero } from '@/components/ui/PageHero';
import { requireSession } from '@/lib/auth/server';
import { getRepository } from '@/lib/repository';

import styles from '../dashboard.module.css';

// 기록은 계속 쌓이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

export default async function OffControlPage() {
  await requireSession();
  const members = await (await getRepository()).getOffUsers();

  const rows: OffUserRow[] = members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    username: m.username,
    avatarUrl: m.avatarUrl,
  }));

  return (
    <div className="container">
      <PageHero
        eyebrow="Off control"
        title="온 오프 컨트롤 유저"
        description="디스코드 온라인 상태가 아닌데 음성방에 들어왔거나 채팅을 친 멤버"
      />
      <section className={styles.section}>
        <OffUserList rows={rows} />
      </section>
    </div>
  );
}

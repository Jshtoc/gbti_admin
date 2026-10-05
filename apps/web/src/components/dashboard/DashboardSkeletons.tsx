import { Skeleton, SkeletonPanel } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';

import styles from './DashboardSkeletons.module.css';

function StatsSkeleton() {
  return (
    <div className={styles.stats}>
      {[0, 1, 2].map((i) => (
        <SkeletonPanel key={i} className={styles.tile}>
          <Skeleton width={70} height={10} />
          <Skeleton width="60%" height={36} radius={10} />
          <Skeleton width="80%" height={10} />
        </SkeletonPanel>
      ))}
    </div>
  );
}

function ListPanelSkeleton({ rows }: { rows: number }) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <Skeleton width={80} height={10} />
        <Skeleton width={200} height={18} />
      </div>
      <SkeletonPanel>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={styles.row}>
            <Skeleton width={28} height={28} radius={999} />
            <div className={styles.rowBody}>
              <Skeleton width={`${70 - i * 6}%`} height={12} />
              <Skeleton width={`${90 - i * 9}%`} height={4} radius={4} />
            </div>
          </div>
        ))}
      </SkeletonPanel>
    </section>
  );
}

/** 대시보드 본문 자리 표시 (기간·멤버를 바꿔 다시 불러오는 동안) */
export function OverviewSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true">
      <p className={styles.status} role="status">
        <Spinner size={14} />
        데이터를 불러오는 중…
      </p>
      <StatsSkeleton />
      <div className={styles.split}>
        <ListPanelSkeleton rows={6} />
        <ListPanelSkeleton rows={6} />
      </div>
      <ListPanelSkeleton rows={4} />
    </div>
  );
}

/** 멤버 상세 본문 자리 표시 */
export function MemberSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true">
      <p className={styles.status} role="status">
        <Spinner size={14} />
        멤버 데이터를 불러오는 중…
      </p>
      <StatsSkeleton />
      <section className={styles.section}>
        <div className={styles.header}>
          <Skeleton width={80} height={10} />
          <Skeleton width={180} height={18} />
        </div>
        <SkeletonPanel>
          <Skeleton height={200} radius={10} />
        </SkeletonPanel>
      </section>
      <div className={styles.split}>
        <ListPanelSkeleton rows={5} />
        <ListPanelSkeleton rows={3} />
      </div>
    </div>
  );
}

/** 페이지 상단(제목 영역) 자리 표시 — 다른 페이지로 이동할 때 loading.tsx에서 사용 */
export function HeroSkeleton() {
  return (
    <div className={styles.hero} aria-hidden="true">
      <Skeleton width={110} height={10} />
      <Skeleton width="min(520px, 80%)" height={72} radius={14} />
      <Skeleton width={260} height={12} />
    </div>
  );
}

import { HeroSkeleton, OverviewSkeleton } from '@/components/dashboard/DashboardSkeletons';

/** 다른 페이지에서 대시보드로 넘어올 때 바로 보여주는 자리 표시 */
export default function OverviewLoading() {
  return (
    <div className="container">
      <HeroSkeleton />
      <OverviewSkeleton />
    </div>
  );
}

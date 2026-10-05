import { HeroSkeleton, MemberSkeleton } from '@/components/dashboard/DashboardSkeletons';

/** 멤버 상세로 넘어갈 때 바로 보여주는 자리 표시 */
export default function MemberLoading() {
  return (
    <div className="container">
      <HeroSkeleton />
      <MemberSkeleton />
    </div>
  );
}

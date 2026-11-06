import { Suspense } from 'react';

import { OverviewSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { MemberPicker } from '@/components/dashboard/MemberPicker';
import { OverviewContent } from '@/components/dashboard/OverviewContent';
import { PageHero } from '@/components/ui/PageHero';
import { PeriodControl } from '@/components/ui/PeriodControl';
import { getRole, requireSession } from '@/lib/auth/server';
import { parseMemberSort } from '@/lib/memberSort';
import type { OverviewQuery } from '@/lib/overviewQuery';
import { NIGHT_LABEL, parsePeriod, periodLabel } from '@/lib/period';
import { getRepository } from '@/lib/repository';

import styles from './dashboard.module.css';

// 집계는 요청 시점 기준이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

interface OverviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  await requireSession();
  const params = await searchParams;
  const period = parsePeriod(params);
  const sort = parseMemberSort(params.sort);

  // 상단 필터에 필요한 가벼운 멤버 목록만 먼저 가져온다 (무거운 집계는 아래 Suspense 안에서)
  // 개요 전용 계정은 멤버 검색·선택이 없다 (목록도 가져오지 않고 member 파라미터는 무시)
  const canPickMember = (await getRole()) !== 'guest';
  const members = canPickMember ? await (await getRepository()).getMembers() : [];
  // 존재하는 멤버만 선택으로 인정한다 (잘못된 값은 전체 보기)
  const memberId = members.find((m) => m.userId === params.member)?.userId;
  const query: OverviewQuery = { period, sort, member: memberId };

  return (
    <div className="container">
      <PageHero
        eyebrow="Server activity"
        title="Overview"
        description={`${periodLabel(period)}${period.night ? ` · 매일 ${NIGHT_LABEL}만` : ''} · 음성 채널, 온라인 상태, 게임 활동 집계`}
        aside={
          <div className={styles.filters}>
            {canPickMember && <MemberPicker members={members} query={query} />}
            <PeriodControl
              period={period}
              basePath="/"
              params={{ sort: sort === 'voice' ? undefined : sort, member: memberId }}
            />
          </div>
        }
      />

      {/* key가 바뀌면(기간·멤버·정렬 변경) 새 경계가 되어 데이터를 기다리는 동안 스켈레톤을 보여준다 */}
      <Suspense key={`${period.from}|${period.to}|${period.night ? 'n' : 'a'}|${memberId ?? ''}|${sort}`} fallback={<OverviewSkeleton />}>
        <OverviewContent period={period} sort={sort} memberId={memberId} />
      </Suspense>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { MemberSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { MemberContent } from '@/components/dashboard/MemberContent';
import { Avatar } from '@/components/ui/Avatar';
import { LinkPending } from '@/components/ui/LinkPending';
import { PageHero } from '@/components/ui/PageHero';
import { PeriodControl } from '@/components/ui/PeriodControl';
import { requireSession } from '@/lib/auth/server';
import { periodHref } from '@/lib/overviewQuery';
import { parsePeriod, periodLabel } from '@/lib/period';
import { getRepository } from '@/lib/repository';

import memberStyles from './member.module.css';

export const dynamic = 'force-dynamic';

interface MemberPageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MemberPage({ params, searchParams }: MemberPageProps) {
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  await requireSession(`/members/${userId}`);
  const period = parsePeriod(query);

  // 상단에 필요한 정보만 가벼운 목록에서 (무거운 집계는 아래 Suspense 안에서)
  const member = (await getRepository().getMembers()).find((m) => m.userId === userId);
  if (!member) notFound();

  return (
    <div className="container">
      <Link href={periodHref('/', period)} className={memberStyles.back}>
        ← Overview <LinkPending size={10} />
      </Link>

      <PageHero
        eyebrow={`Member · @${member.username}`}
        title={member.displayName}
        description={
          <span className={memberStyles.heroMeta}>
            <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />
            {periodLabel(period)}
          </span>
        }
        aside={<PeriodControl period={period} basePath={`/members/${userId}`} />}
      />

      <Suspense key={`${period.from}|${period.to}`} fallback={<MemberSkeleton />}>
        <MemberContent userId={userId} displayName={member.displayName} period={period} />
      </Suspense>
    </div>
  );
}

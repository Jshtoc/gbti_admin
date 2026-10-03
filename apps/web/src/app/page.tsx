import Link from 'next/link';

import { BarList } from '@/components/dashboard/BarList';
import { LeastActiveList } from '@/components/dashboard/LeastActiveList';
import { MemberSelect } from '@/components/dashboard/MemberSelect';
import { MemberTable } from '@/components/dashboard/MemberTable';
import { MessageChannels } from '@/components/dashboard/MessageChannels';
import { RoomCategoryBars } from '@/components/dashboard/RoomCategoryBars';
import { Avatar } from '@/components/ui/Avatar';
import { PageHero } from '@/components/ui/PageHero';
import { PeriodControl } from '@/components/ui/PeriodControl';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { formatCompact, formatDuration, toHours } from '@/lib/format';
import { leastActive, parseMemberSort, sortMembers } from '@/lib/memberSort';
import { overviewHref, periodHref, type OverviewQuery } from '@/lib/overviewQuery';
import { parsePeriod, periodLabel, periodSpanLabel, toDateRange } from '@/lib/period';
import { getRepository } from '@/lib/repository';

import styles from './dashboard.module.css';

// 집계는 요청 시점 기준이므로 정적 생성하지 않는다
export const dynamic = 'force-dynamic';

interface OverviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const sort = parseMemberSort(params.sort);
  const range = toDateRange(period);
  const repo = getRepository();

  const [members, pairs] = await Promise.all([repo.getMemberActivity(range), repo.getCoPlayPairs(range, 8)]);

  // 존재하는 멤버만 선택으로 인정한다 (잘못된 값은 전체 보기)
  const selected = members.find((m) => m.userId === params.member);
  const query: OverviewQuery = { period, sort, member: selected?.userId };
  const [rooms, messageChannels] = await Promise.all([
    repo.getRoomCategoryTimes(range, selected?.userId),
    repo.getMessageChannelCounts(range, selected?.userId),
  ]);

  const totalVoice = members.reduce((sum, m) => sum + m.voiceSeconds, 0);
  const totalMessages = members.reduce((sum, m) => sum + m.messageCount, 0);
  const activeCount = members.filter((m) => m.onlineSeconds > 0 || m.voiceSeconds > 0).length;
  const topPair = pairs[0];
  const span = periodSpanLabel(period);
  const memberOptions = [...members]
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'))
    .map(({ userId, displayName }) => ({ userId, displayName }));

  return (
    <div className="container">
      <PageHero
        eyebrow="Server activity"
        title="Overview"
        description={`${periodLabel(period)} · 음성 채널, 온라인 상태, 메시지 활동 집계`}
        aside={
          <div className={styles.filters}>
            <MemberSelect members={memberOptions} query={query} />
            <PeriodControl
              period={period}
              basePath="/"
              params={{ sort: sort === 'voice' ? undefined : sort, member: selected?.userId }}
            />
          </div>
        }
      />

      <section className={styles.stats} aria-label="요약 지표">
        <Reveal index={0}>
          {selected ? (
            <StatTile
              label="음성 시간"
              value={toHours(selected.voiceSeconds)}
              unit="시간"
              caption={`${selected.displayName} · 서버 전체의 ${totalVoice > 0 ? Math.round((selected.voiceSeconds / totalVoice) * 100) : 0}%`}
              highlight
            />
          ) : (
            <StatTile label="총 음성 시간" value={toHours(totalVoice)} unit="시간" caption={`멤버 전체 합산 · ${span}`} highlight />
          )}
        </Reveal>
        <Reveal index={1}>
          <StatTile
            label="활동 멤버"
            value={String(activeCount)}
            unit={`/ ${members.length}명`}
            caption={`${members.length - activeCount}명은 ${span} 접속 없음`}
          />
        </Reveal>
        <Reveal index={2}>
          <StatTile
            label="메시지"
            value={formatCompact(selected ? selected.messageCount : totalMessages)}
            unit="개"
            caption={selected ? `${selected.displayName} · 내용은 저장하지 않음` : '내용은 저장하지 않고 개수만 집계'}
          />
        </Reveal>
        <Reveal index={3}>
          <StatTile
            label="최장 듀오"
            value={topPair ? toHours(topPair.seconds) : '0'}
            unit="시간"
            caption={topPair ? `${topPair.a.displayName} & ${topPair.b.displayName}` : '함께한 기록 없음'}
          />
        </Reveal>
      </section>

      <div className={styles.split}>
        <section className={styles.section} aria-labelledby="rooms">
          <SectionHeader
            eyebrow={selected ? 'Voice rooms · Member' : 'Voice rooms'}
            title={selected ? `${selected.displayName}의 방 종류별 체류 시간` : '방 종류별 체류 시간'}
            id="rooms"
            aside={
              selected ? (
                <span className={styles.asideLinks}>
                  <Link href={periodHref(`/members/${selected.userId}`, period)}>멤버 상세 →</Link>
                  <Link href={overviewHref({ ...query, member: undefined }, 'rooms')} scroll={false}>
                    전체 보기
                  </Link>
                </span>
              ) : (
                '멤버별 체류 시간 합 (인원 × 시간)'
              )
            }
          />
          <Reveal>
            <div className={styles.panel}>
              <RoomCategoryBars categories={rooms} />
            </div>
          </Reveal>
        </section>

        <section className={styles.section} aria-labelledby="best-duo">
          <SectionHeader
            eyebrow="Best duo"
            title="가장 오래 같이 플레이한 멤버"
            id="best-duo"
            aside={`같은 음성 채널 동시 체류 · ${periodLabel(period)}`}
          />
          <Reveal>
            <div className={styles.panel}>
              <BarList
                ranked
                emptyText="이 기간에 함께 음성 채널에 있던 기록이 없습니다."
                items={pairs.map((p) => ({
                  key: `${p.a.userId}-${p.b.userId}`,
                  value: p.seconds,
                  label: (
                    <>
                      <span className={styles.pairAvatars}>
                        <Avatar name={p.a.displayName} src={p.a.avatarUrl} size="sm" />
                        <Avatar name={p.b.displayName} src={p.b.avatarUrl} size="sm" />
                      </span>
                      <span className={styles.pairNames}>
                        {p.a.displayName} <span className={styles.amp}>&amp;</span> {p.b.displayName}
                      </span>
                    </>
                  ),
                }))}
              />
            </div>
          </Reveal>
        </section>
      </div>

      <div className={styles.split}>
        <section className={styles.section} aria-labelledby="messages">
          <SectionHeader
            eyebrow={selected ? 'Messages · Member' : 'Messages'}
            title={selected ? `${selected.displayName}의 채널별 메시지` : '채널별 메시지'}
            id="messages"
            aside="스레드는 상위 채널 아래에서 펼쳐 보기"
          />
          <Reveal>
            <div className={styles.panel}>
              <MessageChannels rows={messageChannels} />
            </div>
          </Reveal>
        </section>

        <section className={styles.section} aria-labelledby="least-active">
          <SectionHeader eyebrow="Least active" title="접속이 가장 적은 멤버" id="least-active" aside="온라인 시간 적은 순" />
          <LeastActiveList members={leastActive(members, 5)} period={period} />
        </section>
      </div>

      <section className={styles.section} aria-labelledby="members">
        <SectionHeader
          eyebrow="Members"
          title="멤버별 활동"
          id="members"
          aside={`${members.length}명 · 총 ${formatDuration(totalVoice)}`}
        />
        <Reveal>
          <MemberTable members={sortMembers(members, sort)} query={query} />
        </Reveal>
      </section>
    </div>
  );
}

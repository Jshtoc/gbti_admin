import Link from 'next/link';

import { BarList } from '@/components/dashboard/BarList';
import { LeastActiveList } from '@/components/dashboard/LeastActiveList';
import { MemberTable } from '@/components/dashboard/MemberTable';
import { RoomCategoryBars } from '@/components/dashboard/RoomCategoryBars';
import { Avatar } from '@/components/ui/Avatar';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { formatDuration, toHours } from '@/lib/format';
import { leastActive, sortMembers, type MemberSortKey } from '@/lib/memberSort';
import { overviewHref, periodHref, type OverviewQuery } from '@/lib/overviewQuery';
import { periodLabel, periodSpanLabel, toDateRange, type Period } from '@/lib/period';
import { getRepository } from '@/lib/repository';

import styles from '@/app/dashboard.module.css';

interface OverviewContentProps {
  period: Period;
  sort: MemberSortKey;
  /** 이미 존재 여부를 확인한 멤버 ID (없으면 전체 보기) */
  memberId?: string;
}

/**
 * 대시보드 본문 (집계 데이터). 페이지에서 기간·멤버·정렬을 key로 한 Suspense로 감싸서,
 * 값이 바뀌면 본문 자리에 스켈레톤을 보여주고 새 데이터를 기다린다.
 */
export async function OverviewContent({ period, sort, memberId }: OverviewContentProps) {
  const range = toDateRange(period);
  const repo = getRepository();

  const members = await repo.getMemberActivity(range);

  // 존재하는 멤버만 선택으로 인정한다 (잘못된 값은 전체 보기)
  const selected = members.find((m) => m.userId === memberId);
  const query: OverviewQuery = { period, sort, member: selected?.userId };

  // 전체 보기: 서버 듀오 순위 / 멤버 선택: 그 멤버의 상대 순위 + 방 종류별 체류 시간
  const [pairs, partners, rooms] = await Promise.all([
    selected ? [] : repo.getCoPlayPairs(range, 8),
    selected ? repo.getPartners(selected.userId, range, 8) : [],
    selected ? repo.getRoomCategoryTimes(range, selected.userId) : [],
  ]);

  const totalVoice = members.reduce((sum, m) => sum + m.voiceSeconds, 0);
  const activeCount = members.filter((m) => m.onlineSeconds > 0 || m.voiceSeconds > 0).length;
  const topPair = pairs[0];
  const topPartner = partners[0];
  const span = periodSpanLabel(period);

  // 멤버 선택 여부에 따라 배치가 달라지는 섹션
  const leastActiveSection = (count: number) => (
    <section className={styles.section} aria-labelledby="least-active">
      <SectionHeader eyebrow="Least active" title="접속이 가장 적은 멤버" id="least-active" aside={`온라인 시간 적은 순 · 전체 ${members.length}명`} />
      <LeastActiveList members={leastActive(members, members.length)} period={period} pageSize={count} />
    </section>
  );

  return (
    <>
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
          {selected ? (
            <StatTile
              label="최다 듀오"
              value={topPartner ? toHours(topPartner.seconds) : '0'}
              unit="시간"
              caption={topPartner ? `${selected.displayName} & ${topPartner.partner.displayName}` : '함께한 기록 없음'}
            />
          ) : (
            <StatTile
              label="최장 듀오"
              value={topPair ? toHours(topPair.seconds) : '0'}
              unit="시간"
              caption={topPair ? `${topPair.a.displayName} & ${topPair.b.displayName}` : '함께한 기록 없음'}
            />
          )}
        </Reveal>
      </section>

      {selected ? (
        <>
          <div className={styles.split}>
            <section className={styles.section} aria-labelledby="rooms">
              <SectionHeader
                eyebrow="Voice rooms · Member"
                title={`${selected.displayName}의 방 종류별 체류 시간`}
                id="rooms"
                aside={
                  <span className={styles.asideLinks}>
                    <Link href={periodHref(`/members/${selected.userId}`, period)}>멤버 상세 →</Link>
                    <Link href={overviewHref({ ...query, member: undefined })} scroll={false}>
                      전체 보기
                    </Link>
                  </span>
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
                eyebrow="Best duo · Member"
                title={`${selected.displayName}와(과) 가장 오래 같이 플레이한 멤버`}
                id="best-duo"
                aside="이름을 누르면 그 멤버 기준으로 전환"
              />
              <Reveal>
                <div className={styles.panel}>
                  <BarList
                    ranked
                    emptyText="이 기간에 함께 음성 채널에 있던 멤버가 없습니다."
                    items={partners.map((p) => ({
                      key: p.partner.userId,
                      value: p.seconds,
                      href: overviewHref({ ...query, member: p.partner.userId }),
                      label: (
                        <>
                          <Avatar name={p.partner.displayName} src={p.partner.avatarUrl} size="sm" />
                          <span className={styles.pairNames}>{p.partner.displayName}</span>
                        </>
                      ),
                    }))}
                  />
                </div>
              </Reveal>
            </section>
          </div>

          {leastActiveSection(6)}
        </>
      ) : (
        <>
          <div className={styles.split}>
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

            {leastActiveSection(5)}
          </div>
        </>
      )}

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
    </>
  );
}

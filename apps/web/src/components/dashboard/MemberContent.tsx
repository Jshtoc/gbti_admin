import { BarList } from '@/components/dashboard/BarList';
import { VoiceSessionList } from '@/components/dashboard/VoiceSessionList';
import { Avatar } from '@/components/ui/Avatar';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { formatDateTime, formatLastSeen, formatLeftAgo, formatTimeOfDay, toHours } from '@/lib/format';
import { periodHref } from '@/lib/overviewQuery';
import { FIRST_JOIN_DAYS } from '@gbti/db';
import { periodSpanLabel, toDateRange, type Period } from '@/lib/period';
import { getRepository } from '@/lib/repository';

import styles from '@/app/dashboard.module.css';
import memberStyles from '@/app/members/[userId]/member.module.css';

interface MemberContentProps {
  userId: string;
  period: Period;
}

/** 멤버 상세 본문 (집계 데이터). 페이지에서 기간을 key로 한 Suspense로 감싼다 */
export async function MemberContent({ userId, period }: MemberContentProps) {
  const range = toDateRange(period);
  const repo = getRepository();

  const [members, partners, recent, lastExits, avgJoins] = await Promise.all([
    repo.getMemberActivity(range),
    repo.getPartners(userId, range, 5),
    repo.getVoiceSessionGroups(userId, range, 8),
    repo.getLastVoiceExits(),
    repo.getAverageFirstJoins(),
  ]);

  const member = members.find((m) => m.userId === userId);
  const lastExit = lastExits.find((m) => m.userId === userId);
  const avgJoin = avgJoins.find((m) => m.userId === userId);
  const now = new Date();
  const span = periodSpanLabel(period);
  const voiceRank =
    [...members].sort((a, b) => b.voiceSeconds - a.voiceSeconds).findIndex((m) => m.userId === userId) + 1;

  return (
    <>
      <p className={memberStyles.summary}>
        마지막 접속 {formatLastSeen(member?.lastSeenAt ?? null)} · 음성 시간 {voiceRank > 0 ? `${voiceRank}위` : '-'} /{' '}
        {members.length}명
      </p>

      <section className={styles.stats} aria-label="요약 지표">
        <Reveal index={0}>
          <StatTile label="음성 시간" value={toHours(member?.voiceSeconds ?? 0)} unit="시간" caption={span} highlight />
        </Reveal>
        <Reveal index={1}>
          <StatTile
            label="온라인 시간"
            value={toHours(member?.onlineSeconds ?? 0)}
            unit="시간"
            caption="online · idle · dnd 합산"
          />
        </Reveal>
        <Reveal index={2}>
          <StatTile
            label="최다 듀오"
            value={partners[0] ? toHours(partners[0].seconds) : '0'}
            unit="시간"
            caption={partners[0]?.partner.displayName ?? '함께한 기록 없음'}
          />
        </Reveal>
      </section>

      <section className={styles.section} aria-labelledby="member-habit">
        <SectionHeader eyebrow="Habit" title="접속 패턴" id="member-habit" aside="조회 기간과 무관 · 최근 기록 기준" />
        <div className={styles.split}>
          <Reveal index={0}>
            <StatTile
              label="마지막 접속 기록"
              value={
                lastExit?.inVoice
                  ? '지금 음성 중'
                  : lastExit?.lastLeftAt
                    ? formatDateTime(lastExit.lastLeftAt)
                    : '기록 없음'
              }
              caption={
                lastExit?.inVoice
                  ? lastExit.lastChannelName
                  : lastExit?.lastLeftAt
                    ? `${formatLeftAgo(lastExit.lastLeftAt, now)} · ${lastExit.lastChannelName ?? ''}`
                    : '마지막으로 음성방을 나간 시각'
              }
            />
          </Reveal>
          <Reveal index={1}>
            <StatTile
              label="평균 접속 시간대"
              value={avgJoin?.avgSecondOfDay != null ? formatTimeOfDay(avgJoin.avgSecondOfDay) : '기록 없음'}
              caption={`최근 ${FIRST_JOIN_DAYS}일 중 ${avgJoin?.days ?? 0}일 · 하루 첫 음성방 입장 평균`}
            />
          </Reveal>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="partners">
        <SectionHeader eyebrow="Partners" title="함께 오래 플레이한 멤버" id="partners" aside="같은 음성 채널 기준" />
        <Reveal>
          <div className={styles.panel}>
            <BarList
              ranked
              emptyText="이 기간에 함께 음성 채널에 있던 멤버가 없습니다."
              items={partners.map((p) => ({
                key: p.partner.userId,
                value: p.seconds,
                href: periodHref(`/members/${p.partner.userId}`, period),
                label: (
                  <>
                    <Avatar name={p.partner.displayName} src={p.partner.avatarUrl} size="sm" />
                    {p.partner.displayName}
                  </>
                ),
              }))}
            />
          </div>
        </Reveal>
      </section>

      <section className={styles.section} aria-labelledby="recent">
        <SectionHeader
          eyebrow="Voice sessions"
          title="방제목별 음성 세션"
          id="recent"
          aside="같은 방제목은 하나로 · 최근 순"
        />
        <Reveal>
          <VoiceSessionList groups={recent} />
        </Reveal>
      </section>
    </>
  );
}

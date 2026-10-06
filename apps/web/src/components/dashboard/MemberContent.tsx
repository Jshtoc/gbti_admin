import { BarList } from '@/components/dashboard/BarList';
import { DailyVoiceChart } from '@/components/dashboard/DailyVoiceChart';
import { VoiceSessionList } from '@/components/dashboard/VoiceSessionList';
import { Avatar } from '@/components/ui/Avatar';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { formatLastSeen, toHours } from '@/lib/format';
import { periodHref } from '@/lib/overviewQuery';
import { periodSpanLabel, toDateRange, type Period } from '@/lib/period';
import { getRepository } from '@/lib/repository';

import styles from '@/app/dashboard.module.css';
import memberStyles from '@/app/members/[userId]/member.module.css';

interface MemberContentProps {
  userId: string;
  displayName: string;
  period: Period;
}

/** 멤버 상세 본문 (집계 데이터). 페이지에서 기간을 key로 한 Suspense로 감싼다 */
export async function MemberContent({ userId, displayName, period }: MemberContentProps) {
  const range = toDateRange(period);
  const repo = getRepository();

  const [members, partners, games, daily, recent] = await Promise.all([
    repo.getMemberActivity(range),
    repo.getPartners(userId, range, 5),
    repo.getGameTimes(userId, range),
    repo.getDailyVoice(range, userId),
    repo.getVoiceSessionGroups(userId, range, 8),
  ]);

  const member = members.find((m) => m.userId === userId);
  const span = periodSpanLabel(period);
  const voiceRank = [...members].sort((a, b) => b.voiceSeconds - a.voiceSeconds).findIndex((m) => m.userId === userId) + 1;

  return (
    <>
      <p className={memberStyles.summary}>
        마지막 접속 {formatLastSeen(member?.lastSeenAt ?? null)} · 음성 시간 {voiceRank > 0 ? `${voiceRank}위` : '-'} / {members.length}명
      </p>

      <section className={styles.stats} aria-label="요약 지표">
        <Reveal index={0}>
          <StatTile label="음성 시간" value={toHours(member?.voiceSeconds ?? 0)} unit="시간" caption={span} highlight />
        </Reveal>
        <Reveal index={1}>
          <StatTile label="온라인 시간" value={toHours(member?.onlineSeconds ?? 0)} unit="시간" caption="online · idle · dnd 합산" />
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

      <section className={styles.section} aria-labelledby="member-daily">
        <SectionHeader eyebrow="Daily voice" title="일별 음성 체류 시간" id="member-daily" />
        <Reveal>
          <div className={styles.panel}>
            <DailyVoiceChart data={daily} caption={`${displayName}의 ${span} 일별 음성 체류 시간`} />
          </div>
        </Reveal>
      </section>

      <div className={styles.split}>
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

        <section className={styles.section} aria-labelledby="games">
          <SectionHeader eyebrow="Games" title="게임별 플레이 시간" id="games" aside="디스코드 활동 상태 기준" />
          <Reveal>
            <div className={styles.panel}>
              <BarList
                emptyText="이 기간에 기록된 게임 활동이 없습니다."
                items={games.map((g) => ({ key: g.activityName, value: g.seconds, label: g.activityName }))}
              />
            </div>
          </Reveal>
        </section>
      </div>

      <section className={styles.section} aria-labelledby="recent">
        <SectionHeader eyebrow="Voice sessions" title="방제목별 음성 세션" id="recent" aside="같은 방제목은 하나로 · 최근 순" />
        <Reveal>
          <VoiceSessionList groups={recent} />
        </Reveal>
      </section>
    </>
  );
}

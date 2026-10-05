import { sql, type SQL } from 'drizzle-orm';

import { getDb } from './client';
import type {
  CoPlayPair,
  DailyVoice,
  DateRange,
  GameTime,
  MemberActivity,
  MemberListItem,
  PartnerTime,
  RoomCategoryTime,
  VoiceSessionRow,
} from './types';

const TZ = 'Asia/Seoul';

/** drizzle의 raw sql 파라미터로는 postgres.js가 Date를 직렬화하지 않으므로 ISO 문자열로 넘긴다. */
const iso = (date: Date) => date.toISOString();

/** 진행 중인 구간(ended_at null)은 현재 시각까지로 본다. */
const endOf = (alias: string) => sql.raw(`coalesce(${alias}.ended_at, now())`);

/** 구간 [alias.started_at, alias.ended_at)을 range로 잘라낸 길이(초). 겹치지 않으면 0. */
function clippedSeconds(alias: string, range: DateRange): SQL {
  return sql`greatest(0, extract(epoch from
    least(${endOf(alias)}, ${iso(range.to)}::timestamptz)
    - greatest(${sql.raw(alias)}.started_at, ${iso(range.from)}::timestamptz)))`;
}

/** alias 구간이 range와 겹치는 조건 */
function overlapsRange(alias: string, range: DateRange): SQL {
  return sql`${sql.raw(alias)}.started_at < ${iso(range.to)}::timestamptz
    and ${endOf(alias)} > ${iso(range.from)}::timestamptz`;
}

/** 멤버별 활동 요약 (음성/온라인 시간, 가장 많이 한 게임) */
export async function getMemberActivity(
  guildId: string,
  range: DateRange,
): Promise<MemberActivity[]> {
  const rows = await getDb().execute<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    last_seen_ms: number | null;
    voice_seconds: number;
    online_seconds: number;
    top_game: string | null;
  }>(sql`
    with voice as (
      select v.user_id, sum(${clippedSeconds('v', range)}) as s
      from voice_sessions v
      where v.guild_id = ${guildId} and ${overlapsRange('v', range)}
      group by v.user_id
    ),
    online as (
      select p.user_id, sum(${clippedSeconds('p', range)}) as s
      from presence_sessions p
      where p.guild_id = ${guildId} and ${overlapsRange('p', range)}
      group by p.user_id
    ),
    game_totals as (
      select a.user_id, a.activity_name, sum(${clippedSeconds('a', range)}) as s
      from activity_sessions a
      where a.guild_id = ${guildId} and ${overlapsRange('a', range)}
      group by a.user_id, a.activity_name
    ),
    top_game as (
      select distinct on (user_id) user_id, activity_name
      from game_totals
      order by user_id, s desc
    )
    select m.user_id, m.username, m.display_name, m.avatar_url,
      (extract(epoch from m.last_seen_at) * 1000)::float8 as last_seen_ms,
      coalesce(voice.s, 0)::float8 as voice_seconds,
      coalesce(online.s, 0)::float8 as online_seconds,
      top_game.activity_name as top_game
    from members m
    left join voice on voice.user_id = m.user_id
    left join online on online.user_id = m.user_id
    left join top_game on top_game.user_id = m.user_id
    where m.guild_id = ${guildId} and m.left_at is null and not m.is_bot
  `);

  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    lastSeenAt: r.last_seen_ms === null ? null : new Date(r.last_seen_ms),
    voiceSeconds: r.voice_seconds,
    onlineSeconds: r.online_seconds,
    topGame: r.top_game,
  }));
}

/**
 * 같은 음성 채널에 함께 있던 시간 기준 듀오 랭킹.
 * 두 세션 구간의 교집합을 다시 range로 잘라 합산한다.
 */
export async function getCoPlayPairs(
  guildId: string,
  range: DateRange,
  limit = 10,
): Promise<CoPlayPair[]> {
  const rows = await getDb().execute<{
    a_id: string;
    a_name: string;
    a_avatar: string | null;
    b_id: string;
    b_name: string;
    b_avatar: string | null;
    seconds: number;
  }>(sql`
    with pairs as (
      select a.user_id as a_id, b.user_id as b_id,
        sum(greatest(0, extract(epoch from
          least(${endOf('a')}, ${endOf('b')}, ${iso(range.to)}::timestamptz)
          - greatest(a.started_at, b.started_at, ${iso(range.from)}::timestamptz)))) as seconds
      from voice_sessions a
      join voice_sessions b
        on b.guild_id = a.guild_id
       and b.channel_id = a.channel_id
       and a.user_id < b.user_id
       and a.started_at < ${endOf('b')}
       and b.started_at < ${endOf('a')}
      where a.guild_id = ${guildId}
        and ${overlapsRange('a', range)}
        and ${overlapsRange('b', range)}
      group by a.user_id, b.user_id
    )
    select p.a_id, ma.display_name as a_name, ma.avatar_url as a_avatar,
      p.b_id, mb.display_name as b_name, mb.avatar_url as b_avatar,
      p.seconds::float8 as seconds
    from pairs p
    join members ma on ma.guild_id = ${guildId} and ma.user_id = p.a_id
    join members mb on mb.guild_id = ${guildId} and mb.user_id = p.b_id
    where p.seconds > 0
    order by p.seconds desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    a: { userId: r.a_id, displayName: r.a_name, avatarUrl: r.a_avatar },
    b: { userId: r.b_id, displayName: r.b_name, avatarUrl: r.b_avatar },
    seconds: r.seconds,
  }));
}

/** 특정 멤버와 가장 오래 같이 있던 상대 */
export async function getPartners(
  guildId: string,
  userId: string,
  range: DateRange,
  limit = 5,
): Promise<PartnerTime[]> {
  const rows = await getDb().execute<{
    partner_id: string;
    display_name: string;
    avatar_url: string | null;
    seconds: number;
  }>(sql`
    with partners as (
      select b.user_id as partner_id,
        sum(greatest(0, extract(epoch from
          least(${endOf('a')}, ${endOf('b')}, ${iso(range.to)}::timestamptz)
          - greatest(a.started_at, b.started_at, ${iso(range.from)}::timestamptz)))) as seconds
      from voice_sessions a
      join voice_sessions b
        on b.guild_id = a.guild_id
       and b.channel_id = a.channel_id
       and b.user_id <> a.user_id
       and a.started_at < ${endOf('b')}
       and b.started_at < ${endOf('a')}
      where a.guild_id = ${guildId}
        and a.user_id = ${userId}
        and ${overlapsRange('a', range)}
        and ${overlapsRange('b', range)}
      group by b.user_id
    )
    select p.partner_id, m.display_name, m.avatar_url, p.seconds::float8 as seconds
    from partners p
    join members m on m.guild_id = ${guildId} and m.user_id = p.partner_id
    where p.seconds > 0
    order by p.seconds desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    partner: { userId: r.partner_id, displayName: r.display_name, avatarUrl: r.avatar_url },
    seconds: r.seconds,
  }));
}

/** 일별 음성 체류 시간 합계 (Asia/Seoul 자정 기준으로 구간을 쪼갠다). userId를 주면 해당 멤버만. */
export async function getDailyVoice(
  guildId: string,
  range: DateRange,
  userId?: string,
): Promise<DailyVoice[]> {
  const userFilter = userId ? sql`and v.user_id = ${userId}` : sql``;
  const rows = await getDb().execute<{ day: string; seconds: number }>(sql`
    with days as (
      select gs::date as day,
        (gs::date::timestamp at time zone ${TZ}) as ds,
        ((gs::date + 1)::timestamp at time zone ${TZ}) as de
      from generate_series(
        (${iso(range.from)}::timestamptz at time zone ${TZ})::date,
        ((${iso(range.to)}::timestamptz - interval '1 microsecond') at time zone ${TZ})::date,
        interval '1 day'
      ) gs
    )
    select to_char(d.day, 'YYYY-MM-DD') as day,
      coalesce(sum(greatest(0, extract(epoch from
        least(${endOf('v')}, d.de) - greatest(v.started_at, d.ds))))
        -- greatest/least는 NULL을 무시하므로 매칭 안 된 LEFT JOIN 행은 제외해야 한다
        filter (where v.id is not null), 0)::float8 as seconds
    from days d
    left join voice_sessions v
      on v.guild_id = ${guildId}
     and v.started_at < d.de
     and ${endOf('v')} > d.ds
     ${userFilter}
    group by d.day
    order by d.day
  `);

  return rows.map((r) => ({ day: r.day, seconds: r.seconds }));
}

/** 멤버의 게임별 플레이 시간 */
export async function getGameTimes(
  guildId: string,
  userId: string,
  range: DateRange,
): Promise<GameTime[]> {
  const rows = await getDb().execute<{ activity_name: string; seconds: number }>(sql`
    select a.activity_name, sum(${clippedSeconds('a', range)})::float8 as seconds
    from activity_sessions a
    where a.guild_id = ${guildId} and a.user_id = ${userId} and ${overlapsRange('a', range)}
    group by a.activity_name
    order by seconds desc
  `);

  return rows.map((r) => ({ activityName: r.activity_name, seconds: r.seconds }));
}

/** 멤버의 최근 음성 세션 */
export async function getRecentVoiceSessions(
  guildId: string,
  userId: string,
  limit = 10,
): Promise<VoiceSessionRow[]> {
  const rows = await getDb().execute<{
    id: number;
    channel_name: string;
    started_ms: number;
    ended_ms: number | null;
  }>(sql`
    select v.id::int as id, v.channel_name,
      (extract(epoch from v.started_at) * 1000)::float8 as started_ms,
      (extract(epoch from v.ended_at) * 1000)::float8 as ended_ms
    from voice_sessions v
    where v.guild_id = ${guildId} and v.user_id = ${userId}
    order by v.started_at desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    id: r.id,
    channelName: r.channel_name,
    startedAt: new Date(r.started_ms),
    endedAt: r.ended_ms === null ? null : new Date(r.ended_ms),
  }));
}

/**
 * 방 종류별 체류 시간. 멤버 음성 세션 ∩ 방 종류 구간 ∩ 조회 기간을 합산한다 (인원 × 시간).
 * userId를 주면 그 멤버의 체류 시간만.
 */
export async function getRoomCategoryTimes(
  guildId: string,
  range: DateRange,
  userId?: string,
): Promise<RoomCategoryTime[]> {
  const userFilter = userId ? sql`and v.user_id = ${userId}` : sql``;
  const rows = await getDb().execute<{ kind: RoomCategoryTime['kind']; label: string; seconds: number }>(sql`
    select r.category_kind as kind, r.category_label as label,
      sum(greatest(0, extract(epoch from
        least(${endOf('v')}, ${endOf('r')}, ${iso(range.to)}::timestamptz)
        - greatest(v.started_at, r.started_at, ${iso(range.from)}::timestamptz))))::float8 as seconds
    from voice_sessions v
    join voice_room_states r
      on r.guild_id = v.guild_id
     and r.channel_id = v.channel_id
     and v.started_at < ${endOf('r')}
     and r.started_at < ${endOf('v')}
    where v.guild_id = ${guildId}
      and ${overlapsRange('v', range)}
      and ${overlapsRange('r', range)}
      ${userFilter}
    group by r.category_kind, r.category_label
    having sum(greatest(0, extract(epoch from
        least(${endOf('v')}, ${endOf('r')}, ${iso(range.to)}::timestamptz)
        - greatest(v.started_at, r.started_at, ${iso(range.from)}::timestamptz)))) > 0
    order by seconds desc, label
  `);

  return rows.map((r) => ({ kind: r.kind, label: r.label, seconds: r.seconds }));
}

/** 현재 서버에 있는 (봇 아닌) 멤버 목록. 멤버 검색/선택용 가벼운 조회 */
export async function getMembers(guildId: string): Promise<MemberListItem[]> {
  const rows = await getDb().execute<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>(sql`
    select m.user_id, m.username, m.display_name, m.avatar_url
    from members m
    where m.guild_id = ${guildId} and m.left_at is null and not m.is_bot
    order by m.display_name
  `);

  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
  }));
}

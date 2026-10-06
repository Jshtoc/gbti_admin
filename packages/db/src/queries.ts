import { sql, type SQL } from 'drizzle-orm';

import { getDb } from './client';
import { EXCLUDED_NAME_TAGS } from './memberFilter';
import { HIDDEN_SESSION_CHANNEL_KEYWORDS } from './roomCategory';
import type {
  CoPlayPair,
  DailyVoice,
  DateRange,
  GameTime,
  MemberActivity,
  MemberListItem,
  PartnerTime,
  VoiceSessionGroup,
} from './types';

const TZ = 'Asia/Seoul';

/**
 * 통계에서 빼는 멤버가 아닌 조건. alias = members 테이블 별칭
 * - 닉네임에 [게스트]·[부계정] 태그가 있는 멤버
 * - stats_excluded_members 에 지정된 계정 (scope = all, duo 면 듀오 집계에서만 제외)
 */
function notExcludedMember(alias: string, { duo = false } = {}): SQL {
  const m = sql.raw(alias);
  const byTag = EXCLUDED_NAME_TAGS.map((tag) => sql`position(${tag} in ${m}.display_name) = 0`);
  const scopes = duo ? sql`('all', 'duo')` : sql`('all')`;
  const byAccount = sql`not exists (
    select 1 from stats_excluded_members x
    where x.guild_id = ${m}.guild_id and x.user_id = ${m}.user_id and x.scope in ${scopes}
  )`;
  return sql.join([...byTag, byAccount], sql` and `);
}

/** drizzle의 raw sql 파라미터로는 postgres.js가 Date를 직렬화하지 않으므로 ISO 문자열로 넘긴다. */
const iso = (date: Date) => date.toISOString();

/** 진행 중인 구간(ended_at null)은 현재 시각까지로 본다. */
const endOf = (alias: string) => sql.raw(`coalesce(${alias}.ended_at, now())`);

/** 집계 대상 구간들. windows 가 없으면 기간 전체가 구간 하나 */
const windowsOf = (range: DateRange) => range.windows ?? [range];

/**
 * 구간 [start, end) 가 집계 구간들과 겹치는 길이(초)의 합. 겹치지 않으면 0.
 * (시간대 필터가 없으면 구간 하나라 기존과 같은 결과)
 */
function windowedSeconds(start: SQL, end: SQL, range: DateRange): SQL {
  const parts = windowsOf(range).map(
    (w) => sql`greatest(0, extract(epoch from
      least(${end}, ${iso(w.to)}::timestamptz) - greatest(${start}, ${iso(w.from)}::timestamptz)))`,
  );
  return parts.length > 0 ? sql`(${sql.join(parts, sql` + `)})` : sql`0`;
}

/** 구간 [alias.started_at, alias.ended_at) 의 집계 대상 길이(초) */
function clippedSeconds(alias: string, range: DateRange): SQL {
  return windowedSeconds(sql`${sql.raw(alias)}.started_at`, endOf(alias), range);
}

/** 두 세션 a, b 가 함께 있던 시간(교집합)의 집계 대상 길이(초) */
function sharedSeconds(a: string, b: string, range: DateRange): SQL {
  return windowedSeconds(
    sql`greatest(${sql.raw(a)}.started_at, ${sql.raw(b)}.started_at)`,
    sql`least(${endOf(a)}, ${endOf(b)})`,
    range,
  );
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
    where m.guild_id = ${guildId} and m.left_at is null and not m.is_bot and ${notExcludedMember('m')}
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
        sum(${sharedSeconds('a', 'b', range)}) as seconds
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
    join members ma on ma.guild_id = ${guildId} and ma.user_id = p.a_id and ${notExcludedMember('ma', { duo: true })}
    join members mb on mb.guild_id = ${guildId} and mb.user_id = p.b_id and ${notExcludedMember('mb', { duo: true })}
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
        sum(${sharedSeconds('a', 'b', range)}) as seconds
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
    join members m on m.guild_id = ${guildId} and m.user_id = p.partner_id and ${notExcludedMember('m', { duo: true })}
    join members me on me.guild_id = ${guildId} and me.user_id = ${userId} and ${notExcludedMember('me', { duo: true })}
    where p.seconds > 0
    order by p.seconds desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    partner: { userId: r.partner_id, displayName: r.display_name, avatarUrl: r.avatar_url },
    seconds: r.seconds,
  }));
}

/**
 * 일별 음성 체류 시간 합계. 기본은 Asia/Seoul 자정 기준 하루,
 * 시간대 필터(range.windows)가 있으면 구간 하나를 하루로 본다. userId를 주면 해당 멤버만.
 */
export async function getDailyVoice(
  guildId: string,
  range: DateRange,
  userId?: string,
): Promise<DailyVoice[]> {
  const userFilter = userId ? sql`and v.user_id = ${userId}` : sql``;
  const days = range.windows
    ? range.windows.length > 0
      ? sql`select * from (values ${sql.join(
          range.windows.map(
            (w) => sql`((${iso(w.from)}::timestamptz at time zone ${TZ})::date, ${iso(w.from)}::timestamptz, ${iso(w.to)}::timestamptz)`,
          ),
          sql`, `,
        )}) as w(day, ds, de)`
      : sql`select null::date as day, null::timestamptz as ds, null::timestamptz as de where false`
    : sql`select gs::date as day,
        (gs::date::timestamp at time zone ${TZ}) as ds,
        ((gs::date + 1)::timestamp at time zone ${TZ}) as de
      from generate_series(
        (${iso(range.from)}::timestamptz at time zone ${TZ})::date,
        ((${iso(range.to)}::timestamptz - interval '1 microsecond') at time zone ${TZ})::date,
        interval '1 day'
      ) gs`;
  const rows = await getDb().execute<{ day: string; seconds: number }>(sql`
    with days as (
      ${days}
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

/** 멤버의 음성 세션을 채널 이름(방제목)별로 묶은 것. 최근에 들어간 순 */
export async function getVoiceSessionGroups(
  guildId: string,
  userId: string,
  range: DateRange,
  limit = 8,
): Promise<VoiceSessionGroup[]> {
  const hiddenChannels = sql.join(
    HIDDEN_SESSION_CHANNEL_KEYWORDS.map((keyword) => sql`and position(${keyword} in v.channel_name) = 0`),
    sql` `,
  );
  const rows = await getDb().execute<{
    channel_name: string;
    count: number;
    seconds: number;
    last_ms: number;
    live: boolean;
  }>(sql`
    select v.channel_name, count(*)::int as count,
      sum(${clippedSeconds('v', range)})::float8 as seconds,
      (extract(epoch from max(v.started_at)) * 1000)::float8 as last_ms,
      bool_or(v.ended_at is null) as live
    from voice_sessions v
    where v.guild_id = ${guildId} and v.user_id = ${userId}
      and ${overlapsRange('v', range)}
      and ${clippedSeconds('v', range)} > 0
      ${hiddenChannels}
    group by v.channel_name
    order by max(v.started_at) desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    channelName: r.channel_name,
    count: r.count,
    seconds: r.seconds,
    lastStartedAt: new Date(r.last_ms),
    live: r.live,
  }));
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
    where m.guild_id = ${guildId} and m.left_at is null and not m.is_bot and ${notExcludedMember('m')}
    order by m.display_name
  `);

  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
  }));
}

import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 디스코드 ID(snowflake)는 JS number 범위를 넘으므로 text로 저장한다.
// 모든 시간 구간은 [started_at, ended_at) 이며, ended_at이 null이면 진행 중인 구간이다.

const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const members = pgTable(
  'members',
  {
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    isBot: boolean('is_bot').notNull().default(false),
    joinedAt: tstz('joined_at'),
    leftAt: tstz('left_at'),
    lastSeenAt: tstz('last_seen_at'),
    updatedAt: tstz('updated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.userId] })],
);

/** 음성 채널 체류 구간. "같이 플레이"는 같은 채널 구간의 겹침으로 계산한다. */
export const voiceSessions = pgTable(
  'voice_sessions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    channelId: text('channel_id').notNull(),
    channelName: text('channel_name').notNull(),
    startedAt: tstz('started_at').notNull(),
    endedAt: tstz('ended_at'),
  },
  (t) => [
    index('voice_sessions_guild_started_idx').on(t.guildId, t.startedAt),
    index('voice_sessions_channel_started_idx').on(t.guildId, t.channelId, t.startedAt),
    index('voice_sessions_user_started_idx').on(t.guildId, t.userId, t.startedAt),
    // 한 유저는 동시에 하나의 음성 채널에만 있을 수 있다
    uniqueIndex('voice_sessions_one_open_per_user')
      .on(t.guildId, t.userId)
      .where(sql`${t.endedAt} is null`),
  ],
);

/**
 * 마이크를 끈 구간 (본인 음소거·헤드셋 소리 끔·관리자 음소거 모두). 음성 채널에 있는 동안만 생기고,
 * 음성방을 나가면 닫는다. "잠수 시간" = 이 구간과 voice_sessions 의 겹침.
 */
export const voiceMuteSessions = pgTable(
  'voice_mute_sessions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    startedAt: tstz('started_at').notNull(),
    endedAt: tstz('ended_at'),
  },
  (t) => [
    index('voice_mute_sessions_user_started_idx').on(t.guildId, t.userId, t.startedAt),
    uniqueIndex('voice_mute_sessions_one_open_per_user')
      .on(t.guildId, t.userId)
      .where(sql`${t.endedAt} is null`),
  ],
);

/**
 * 방(음성 채널) 종류 구간. 판정 규칙은 roomCategory.ts의 classifyRoom.
 * 방 인원이나 방 안 멤버의 게임 상태가 바뀌어 판정 결과가 달라지면 구간을 닫고 새로 연다.
 * 방이 비면 구간을 닫는다.
 */
export const voiceRoomStates = pgTable(
  'voice_room_states',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    guildId: text('guild_id').notNull(),
    channelId: text('channel_id').notNull(),
    /** 판정 당시 방 제목 */
    channelName: text('channel_name').notNull(),
    categoryKind: text('category_kind', { enum: ['hangout', 'game', 'unknown'] }).notNull(),
    categoryLabel: text('category_label').notNull(),
    startedAt: tstz('started_at').notNull(),
    endedAt: tstz('ended_at'),
  },
  (t) => [
    index('voice_room_states_channel_started_idx').on(t.guildId, t.channelId, t.startedAt),
    uniqueIndex('voice_room_states_one_open_per_channel')
      .on(t.guildId, t.channelId)
      .where(sql`${t.endedAt} is null`),
  ],
);

/** 온라인 상태 구간 (online / idle / dnd). offline이 되면 구간을 닫는다. */
export const presenceSessions = pgTable(
  'presence_sessions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    status: text('status', { enum: ['online', 'idle', 'dnd'] }).notNull(),
    startedAt: tstz('started_at').notNull(),
    endedAt: tstz('ended_at'),
  },
  (t) => [
    index('presence_sessions_user_started_idx').on(t.guildId, t.userId, t.startedAt),
    uniqueIndex('presence_sessions_one_open_per_user')
      .on(t.guildId, t.userId)
      .where(sql`${t.endedAt} is null`),
  ],
);

/** 게임(Activity) 플레이 구간. 디스코드 "플레이 중" 상태 기준. */
export const activitySessions = pgTable(
  'activity_sessions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    activityName: text('activity_name').notNull(),
    startedAt: tstz('started_at').notNull(),
    endedAt: tstz('ended_at'),
  },
  (t) => [index('activity_sessions_user_started_idx').on(t.guildId, t.userId, t.startedAt)],
);

/**
 * 채널 정보 (이름/종류/상위 채널). 봇이 메시지를 받을 때 그 채널과 상위 채널을 upsert한다.
 * 스레드는 kind='thread', parent_id = 스레드가 속한 텍스트/포럼 채널.
 */
export const channels = pgTable(
  'channels',
  {
    guildId: text('guild_id').notNull(),
    channelId: text('channel_id').notNull(),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['text', 'forum', 'thread', 'voice', 'other'] }).notNull(),
    parentId: text('parent_id'),
    updatedAt: tstz('updated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.channelId] })],
);

/**
 * 메시지 수 일별 집계. 내용은 저장하지 않는다.
 * channel_id는 메시지가 올라온 곳 그대로 (스레드 메시지면 스레드 ID).
 */
export const messageCountsDaily = pgTable(
  'message_counts_daily',
  {
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    channelId: text('channel_id').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.guildId, t.userId, t.channelId, t.day] }),
    index('message_counts_daily_guild_day_idx').on(t.guildId, t.day),
  ],
);

/**
 * 온라인 상태가 아닌데(오프라인·invisible) 음성방에 있거나 채팅을 친 순간의 기록 ("온 오프 컨트롤 유저").
 * 메시지 내용은 저장하지 않는다. 음성은 입장·이동 시, 오프라인으로 바뀔 때, 봇 시작 시 음성방에 있을 때 남기고,
 * 메시지는 같은 사람이 1분에 한 번만 남긴다.
 */
export const offlineActivityEvents = pgTable(
  'offline_activity_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    source: text('source', { enum: ['voice', 'message'] }).notNull(),
    /** 음성방 또는 채팅 채널 이름 */
    channelName: text('channel_name'),
    occurredAt: tstz('occurred_at').notNull(),
  },
  (t) => [index('offline_activity_events_user_idx').on(t.guildId, t.userId, t.occurredAt)],
);

/**
 * 봇 상태. 봇이 1분마다 last_heartbeat_at을 갱신한다.
 * 봇이 꺼졌다 켜지면 열려 있던 구간들을 마지막 하트비트 시각으로 닫아서
 * 꺼져 있던 동안이 체류 시간으로 잘못 집계되지 않게 한다.
 */
export const botStatus = pgTable('bot_status', {
  guildId: text('guild_id').primaryKey(),
  startedAt: tstz('started_at').notNull(),
  lastHeartbeatAt: tstz('last_heartbeat_at').notNull(),
});

/**
 * 통계에서 빼는 멤버 (계정 단위). 닉네임 태그 규칙(memberFilter.ts)과 별개로,
 * 특정 계정을 지정해서 뺄 때 쓴다. 공개 저장소에 계정 ID를 남기지 않도록 DB에만 둔다.
 */
export const statsExcludedMembers = pgTable(
  'stats_excluded_members',
  {
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    /** all = 모든 통계에서 제외, duo = 듀오(같이 플레이) 순위에서만 제외 */
    scope: text('scope', { enum: ['all', 'duo'] }).notNull().default('all'),
    /** 추가할 때의 닉네임 등 메모 */
    note: text('note'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.userId] })],
);

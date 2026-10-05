import 'server-only';

import type {
  CoPlayPair,
  DailyVoice,
  DateRange,
  GameTime,
  MemberActivity,
  MemberRef,
  PartnerTime,
  RoomCategoryTime,
  VoiceSessionRow,
} from '@gbti/db';
import { classifyRoom, type RoomCategoryKind } from '@gbti/db/roomCategory';

import { clippedSeconds, DAY_MS, kstDayKey, kstMidnight } from '../time';
import type { DashboardRepository } from './types';

// ─── 목데이터 정의 ──────────────────────────────────────────────
// 봇이 붙기 전까지 화면을 확인하기 위한 가짜 서버. 시드 고정이라 새로고침해도 결과가 같다.

interface MockChannel {
  id: string;
  /** 세션마다 이 중 하나로 방 제목이 바뀐다 (실제 서버처럼 제목을 자주 바꾸는 상황) */
  titles: string[];
  /** 이 방 멤버들이 하는 게임. null이면 각자 soloGame을 하거나 아무것도 안 함 */
  game: string | null;
  playChance: number;
}

interface MockMember {
  userId: string;
  displayName: string;
  username: string;
  /** 그룹이 플레이할 때 참여할 확률 */
  level: number;
  channels: string[];
  soloGame: string | null;
  /** 디스코드 "활동 상태 표시" 설정. false면 봇이 게임을 알 수 없다 */
  showsActivity: boolean;
  /** 이 일수 이전까지만 활동 (휴면 멤버). null이면 계속 활동 */
  inactiveForDays: number | null;
}

const CHANNELS: MockChannel[] = [
  { id: 'c-lol', titles: ['아브아', '롤 내전', '칼바람 ㄱ'], game: 'League of Legends', playChance: 0.7 },
  { id: 'c-val', titles: ['문어다리교', '발로 5인큐'], game: 'VALORANT', playChance: 0.5 },
  { id: 'c-pubg', titles: ['배그', '치킨 먹자'], game: 'PUBG: BATTLEGROUNDS', playChance: 0.45 },
  { id: 'c-talk', titles: ['새벽 수다', '수다방', '노래방'], game: null, playChance: 0.5 },
  { id: 'c-free', titles: ['할거 없는 사람', '각자 할 거 하는 방', '할하방'], game: null, playChance: 0.45 },
];

const MEMBERS: MockMember[] = [
  { userId: 'u01', displayName: '새벽감성', username: 'dawn_mood', level: 0.92, channels: ['c-lol', 'c-talk', 'c-free'], soloGame: 'Teamfight Tactics', showsActivity: true, inactiveForDays: null },
  { userId: 'u02', displayName: '탑신병자', username: 'topdiff', level: 0.88, channels: ['c-lol'], soloGame: 'League of Legends', showsActivity: true, inactiveForDays: null },
  { userId: 'u03', displayName: '정글차이', username: 'jgl_gap', level: 0.7, channels: ['c-lol', 'c-val'], soloGame: null, showsActivity: false, inactiveForDays: null },
  { userId: 'u04', displayName: '미드or피드', username: 'mid_or_feed', level: 0.6, channels: ['c-lol'], soloGame: 'Teamfight Tactics', showsActivity: true, inactiveForDays: null },
  { userId: 'u05', displayName: '서폿장인', username: 'supp_master', level: 0.55, channels: ['c-lol', 'c-talk'], soloGame: null, showsActivity: true, inactiveForDays: null },
  { userId: 'u06', displayName: '헤드원탭', username: 'hs_onetap', level: 0.6, channels: ['c-val'], soloGame: 'VALORANT', showsActivity: true, inactiveForDays: null },
  { userId: 'u07', displayName: '스파이크', username: 'spike_plant', level: 0.8, channels: ['c-val', 'c-pubg'], soloGame: null, showsActivity: false, inactiveForDays: null },
  { userId: 'u08', displayName: '연막왕', username: 'smoke_king', level: 0.5, channels: ['c-val'], soloGame: 'Counter-Strike 2', showsActivity: false, inactiveForDays: null },
  { userId: 'u09', displayName: '치킨배달', username: 'chicken_dinner', level: 0.78, channels: ['c-pubg'], soloGame: 'PUBG: BATTLEGROUNDS', showsActivity: true, inactiveForDays: null },
  { userId: 'u10', displayName: '파밍중독', username: 'loot_addict', level: 0.66, channels: ['c-pubg', 'c-talk', 'c-free'], soloGame: 'Lost Ark', showsActivity: true, inactiveForDays: null },
  { userId: 'u11', displayName: '자기장러너', username: 'zone_runner', level: 0.45, channels: ['c-pubg'], soloGame: null, showsActivity: true, inactiveForDays: null },
  { userId: 'u12', displayName: '수다쟁이', username: 'chatterbox', level: 0.9, channels: ['c-talk', 'c-free'], soloGame: 'Minecraft', showsActivity: true, inactiveForDays: null },
  { userId: 'u13', displayName: '야근요정', username: 'overtime_fairy', level: 0.35, channels: ['c-talk', 'c-lol', 'c-free'], soloGame: null, showsActivity: false, inactiveForDays: null },
  { userId: 'u14', displayName: '주말전사', username: 'weekend_warrior', level: 0.3, channels: ['c-val', 'c-pubg'], soloGame: 'Apex Legends', showsActivity: false, inactiveForDays: null },
  { userId: 'u15', displayName: '눈팅족', username: 'lurker', level: 0.12, channels: ['c-talk'], soloGame: null, showsActivity: false, inactiveForDays: null },
  { userId: 'u16', displayName: '랭크포기', username: 'rank_quit', level: 0.4, channels: ['c-lol'], soloGame: null, showsActivity: true, inactiveForDays: 12 },
  { userId: 'u17', displayName: '군대간형', username: 'enlisted_bro', level: 0.7, channels: ['c-pubg', 'c-talk'], soloGame: null, showsActivity: true, inactiveForDays: 41 },
  { userId: 'u18', displayName: '잠수함', username: 'submarine', level: 0.08, channels: ['c-val'], soloGame: null, showsActivity: false, inactiveForDays: 26 },
  { userId: 'u19', displayName: '유령회원', username: 'ghost_member', level: 0, channels: [], soloGame: null, showsActivity: false, inactiveForDays: null },
  { userId: 'u20', displayName: '신입생', username: 'freshman', level: 0.5, channels: ['c-talk', 'c-val', 'c-free'], soloGame: 'Overwatch 2', showsActivity: true, inactiveForDays: null },
];

const GENERATED_DAYS = 90;

// ─── 생성 ───────────────────────────────────────────────────────

interface Interval {
  userId: string;
  startedAt: Date;
  /** null = 진행 중 */
  endedAt: Date | null;
}

interface VoiceInterval extends Interval {
  id: number;
  channelId: string;
  channelName: string;
}

interface ActivityInterval extends Interval {
  activityName: string;
}

/** voice_room_states 와 같은 구조 */
interface RoomStateInterval {
  channelId: string;
  kind: RoomCategoryKind;
  label: string;
  startedAt: Date;
  endedAt: Date | null;
}

interface MockDataset {
  voice: VoiceInterval[];
  rooms: RoomStateInterval[];
  presence: Interval[];
  activity: ActivityInterval[];
  lastSeen: Map<string, Date | null>;
}

/** mulberry32: 시드 고정 의사난수 */
function createRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function generate(now: Date): MockDataset {
  const rand = createRandom(20261003);
  const between = (min: number, max: number) => min + rand() * (max - min);

  const voice: VoiceInterval[] = [];
  const rooms: RoomStateInterval[] = [];
  const presence: Interval[] = [];
  const activity: ActivityInterval[] = [];
  let voiceId = 1;

  const today = kstMidnight(now);

  /** 미래 구간은 버리고, 현재를 걸치는 구간은 진행 중(null)으로 만든다 */
  const settle = (start: number, end: number): [Date, Date | null] | null => {
    if (start >= now.getTime()) return null;
    return [new Date(start), end > now.getTime() ? null : new Date(end)];
  };

  for (let daysAgo = GENERATED_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dayStart = today.getTime() - daysAgo * DAY_MS;
    const dayKey = kstDayKey(new Date(dayStart));
    const isWeekend = [0, 6].includes(new Date(dayStart + 9 * HOUR).getUTCDay());
    const isActive = (m: MockMember) => m.inactiveForDays === null || daysAgo > m.inactiveForDays;

    /** userId → 그날 음성 [첫 입장, 마지막 퇴장] */
    const dayVoice = new Map<string, [number, number]>();

    for (const channel of CHANNELS) {
      const chance = Math.min(0.95, channel.playChance + (isWeekend ? 0.15 : 0));
      if (rand() > chance) continue;

      const start = dayStart + between(19, 23) * HOUR;
      const end = start + between(1.5, isWeekend ? 6 : 4) * HOUR;
      const title = channel.titles[Math.floor(rand() * channel.titles.length)]!;

      /** 이 세션에 들어온 멤버와 그들이 보이는 게임 */
      let roomStart = Infinity;
      let roomEnd = -Infinity;
      const visibleGames: string[] = [];

      for (const member of MEMBERS) {
        if (!member.channels.includes(channel.id) || !isActive(member)) continue;
        if (rand() > member.level) continue;

        const joinAt = start + between(0, 45) * MIN;
        const leaveAt = Math.max(joinAt + 20 * MIN, end - between(0, 70) * MIN);
        const settled = settle(joinAt, leaveAt);
        if (!settled) continue;

        // 같은 날 다른 채널과 겹치면 건너뛴다 (한 번에 한 채널)
        const prev = dayVoice.get(member.userId);
        if (prev && joinAt < prev[1] && leaveAt > prev[0]) continue;

        const [startedAt, endedAt] = settled;
        voice.push({ id: voiceId++, userId: member.userId, channelId: channel.id, channelName: title, startedAt, endedAt });
        dayVoice.set(member.userId, prev ? [Math.min(prev[0], joinAt), Math.max(prev[1], leaveAt)] : [joinAt, leaveAt]);
        roomStart = Math.min(roomStart, joinAt);
        roomEnd = Math.max(roomEnd, leaveAt);

        // 그룹 게임방이면 그 게임, 아니면 가끔 각자 게임. 활동 표시를 끈 멤버는 봇이 모른다
        const game = channel.game ?? (member.soloGame && rand() < 0.5 ? member.soloGame : null);
        if (game && member.showsActivity) {
          activity.push({ userId: member.userId, activityName: game, startedAt, endedAt });
          visibleGames.push(game);
        }
      }

      // 방 종류는 봇과 같은 규칙으로 판정 (세션 동안 한 번)
      const settledRoom = roomStart < roomEnd ? settle(roomStart, roomEnd) : null;
      if (settledRoom) {
        const category = classifyRoom(title, visibleGames);
        rooms.push({ channelId: channel.id, ...category, startedAt: settledRoom[0], endedAt: settledRoom[1] });
      }
    }

    for (const member of MEMBERS) {
      if (!isActive(member) || member.level === 0) continue;

      const v = dayVoice.get(member.userId);
      let onlineStart: number;
      let onlineEnd: number;
      if (v) {
        onlineStart = v[0] - between(20, 120) * MIN;
        onlineEnd = v[1] + between(5, 60) * MIN;
      } else if (rand() < member.level * 0.6) {
        onlineStart = dayStart + between(11, 22) * HOUR;
        onlineEnd = onlineStart + between(0.3, 3) * HOUR;
        if (member.soloGame && rand() < 0.5) {
          const gameStart = onlineStart + between(5, 20) * MIN;
          const settledGame = settle(gameStart, onlineEnd - 5 * MIN);
          if (settledGame) {
            activity.push({ userId: member.userId, activityName: member.soloGame, startedAt: settledGame[0], endedAt: settledGame[1] });
          }
        }
      } else {
        continue;
      }
      const settled = settle(onlineStart, onlineEnd);
      if (settled) presence.push({ userId: member.userId, startedAt: settled[0], endedAt: settled[1] });

    }
  }

  const lastSeen = new Map<string, Date | null>();
  for (const p of presence) {
    const end = p.endedAt ?? now;
    const current = lastSeen.get(p.userId);
    if (!current || end > current) lastSeen.set(p.userId, end);
  }

  return { voice, rooms, presence, activity, lastSeen };
}

// ─── 집계 (packages/db/src/queries.ts 의 SQL과 같은 규칙) ─────────

type Span = Pick<Interval, 'startedAt' | 'endedAt'>;

const endOf = (i: Span, now: Date) => i.endedAt ?? now;

const overlaps = (i: Span, range: DateRange, now: Date) =>
  i.startedAt < range.to && endOf(i, now) > range.from;

function sumByUser(intervals: Interval[], range: DateRange, now: Date): Map<string, number> {
  const totals = new Map<string, number>();
  for (const i of intervals) {
    if (!overlaps(i, range, now)) continue;
    totals.set(i.userId, (totals.get(i.userId) ?? 0) + clippedSeconds(i.startedAt, endOf(i, now), range));
  }
  return totals;
}

/** 같은 채널 두 세션의 교집합을 range로 자른 길이 */
function sharedSeconds(a: VoiceInterval, b: VoiceInterval, range: DateRange, now: Date): number {
  if (a.channelId !== b.channelId) return 0;
  const start = new Date(Math.max(a.startedAt.getTime(), b.startedAt.getTime()));
  const end = new Date(Math.min(endOf(a, now).getTime(), endOf(b, now).getTime()));
  return end > start ? clippedSeconds(start, end, range) : 0;
}

const toRef = (m: MockMember): MemberRef => ({
  userId: m.userId,
  displayName: m.displayName,
  avatarUrl: null,
});

export function createMockRepository(): DashboardRepository {
  const data = generate(new Date());
  const memberById = new Map(MEMBERS.map((m) => [m.userId, m]));

  const voiceInRange = (range: DateRange, now: Date) =>
    data.voice.filter((v) => overlaps(v, range, now));

  return {
    async getMembers() {
      return MEMBERS.map((member) => ({ ...toRef(member), username: member.username })).sort((a, b) =>
        a.displayName.localeCompare(b.displayName, 'ko'),
      );
    },

    async getMemberActivity(range) {
      const now = new Date();
      const voice = sumByUser(data.voice, range, now);
      const online = sumByUser(data.presence, range, now);

      const games = new Map<string, Map<string, number>>();
      for (const a of data.activity) {
        if (!overlaps(a, range, now)) continue;
        const perGame = games.get(a.userId) ?? new Map<string, number>();
        perGame.set(a.activityName, (perGame.get(a.activityName) ?? 0) + clippedSeconds(a.startedAt, endOf(a, now), range));
        games.set(a.userId, perGame);
      }

      return MEMBERS.map((m): MemberActivity => {
        const topGame = [...(games.get(m.userId) ?? [])].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;

        return {
          ...toRef(m),
          username: m.username,
          voiceSeconds: voice.get(m.userId) ?? 0,
          onlineSeconds: online.get(m.userId) ?? 0,
          topGame,
          lastSeenAt: data.lastSeen.get(m.userId) ?? null,
        };
      });
    },

    async getCoPlayPairs(range, limit = 10) {
      const now = new Date();
      const sessions = voiceInRange(range, now);
      const totals = new Map<string, number>();

      for (let i = 0; i < sessions.length; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
          const a = sessions[i]!;
          const b = sessions[j]!;
          if (a.userId === b.userId) continue;
          const seconds = sharedSeconds(a, b, range, now);
          if (seconds === 0) continue;
          const key = a.userId < b.userId ? `${a.userId}|${b.userId}` : `${b.userId}|${a.userId}`;
          totals.set(key, (totals.get(key) ?? 0) + seconds);
        }
      }

      return [...totals]
        .sort((x, y) => y[1] - x[1])
        .slice(0, limit)
        .map(([key, seconds]): CoPlayPair => {
          const [aId, bId] = key.split('|') as [string, string];
          return { a: toRef(memberById.get(aId)!), b: toRef(memberById.get(bId)!), seconds };
        });
    },

    async getPartners(userId, range, limit = 5) {
      const now = new Date();
      const sessions = voiceInRange(range, now);
      const mine = sessions.filter((s) => s.userId === userId);
      const totals = new Map<string, number>();

      for (const a of mine) {
        for (const b of sessions) {
          if (b.userId === userId) continue;
          const seconds = sharedSeconds(a, b, range, now);
          if (seconds > 0) totals.set(b.userId, (totals.get(b.userId) ?? 0) + seconds);
        }
      }

      return [...totals]
        .sort((x, y) => y[1] - x[1])
        .slice(0, limit)
        .map(([id, seconds]): PartnerTime => ({ partner: toRef(memberById.get(id)!), seconds }));
    },

    async getDailyVoice(range, userId) {
      const now = new Date();
      const sessions = voiceInRange(range, now).filter((v) => !userId || v.userId === userId);
      const days: DailyVoice[] = [];

      for (let dayStart = kstMidnight(range.from).getTime(); dayStart < range.to.getTime(); dayStart += DAY_MS) {
        const day: DateRange = { from: new Date(dayStart), to: new Date(dayStart + DAY_MS) };
        const seconds = sessions.reduce((sum, v) => sum + clippedSeconds(v.startedAt, endOf(v, now), day), 0);
        days.push({ day: kstDayKey(day.from), seconds });
      }
      return days;
    },

    async getGameTimes(userId, range) {
      const now = new Date();
      const totals = new Map<string, number>();
      for (const a of data.activity) {
        if (a.userId !== userId || !overlaps(a, range, now)) continue;
        totals.set(a.activityName, (totals.get(a.activityName) ?? 0) + clippedSeconds(a.startedAt, endOf(a, now), range));
      }
      return [...totals]
        .map(([activityName, seconds]): GameTime => ({ activityName, seconds }))
        .sort((x, y) => y.seconds - x.seconds);
    },

    async getRecentVoiceSessions(userId, limit = 10) {
      return data.voice
        .filter((v) => v.userId === userId)
        .sort((x, y) => y.startedAt.getTime() - x.startedAt.getTime())
        .slice(0, limit)
        .map((v): VoiceSessionRow => ({
          id: v.id,
          channelName: v.channelName,
          startedAt: v.startedAt,
          endedAt: v.endedAt,
        }));
    },

    async getRoomCategoryTimes(range, userId) {
      const now = new Date();
      const roomsByChannel = new Map<string, RoomStateInterval[]>();
      for (const r of data.rooms) {
        if (!overlaps(r, range, now)) continue;
        const list = roomsByChannel.get(r.channelId) ?? [];
        list.push(r);
        roomsByChannel.set(r.channelId, list);
      }

      const totals = new Map<string, RoomCategoryTime>();
      for (const v of voiceInRange(range, now)) {
        if (userId && v.userId !== userId) continue;
        for (const r of roomsByChannel.get(v.channelId) ?? []) {
          // 세션 ∩ 방 종류 구간 ∩ 조회 기간
          const start = new Date(Math.max(v.startedAt.getTime(), r.startedAt.getTime()));
          const end = new Date(Math.min(endOf(v, now).getTime(), endOf(r, now).getTime()));
          if (end <= start) continue;
          const seconds = clippedSeconds(start, end, range);
          if (seconds === 0) continue;
          const key = `${r.kind}|${r.label}`;
          const current = totals.get(key) ?? { kind: r.kind, label: r.label, seconds: 0 };
          current.seconds += seconds;
          totals.set(key, current);
        }
      }
      // SQL과 같은 순서: 시간 많은 순, 같으면 이름순
      return [...totals.values()].sort(
        (x, y) => y.seconds - x.seconds || (x.label < y.label ? -1 : x.label > y.label ? 1 : 0),
      );
    },
  };
}

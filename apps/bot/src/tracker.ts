import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';

import type { Database } from '@gbti/db';
import { classifyRoom } from '@gbti/db/roomCategory';
import {
  activitySessions,
  botStatus,
  channels,
  members,
  messageCountsDaily,
  presenceSessions,
  voiceRoomStates,
  voiceSessions,
} from '@gbti/db/schema';

import { kstDayKey } from './time';

// 디스코드와 무관한 기록 로직. 디스코드 이벤트 → 여기 메서드 호출 (bot.ts).
// 모든 구간은 [started_at, ended_at), ended_at null = 진행 중.
// 같은 길드의 호출은 bot.ts에서 순서대로(직렬로) 실행된다고 가정한다.

export interface MemberInfo {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isBot: boolean;
  joinedAt: Date | null;
}

export interface ChannelInfo {
  channelId: string;
  name: string;
  kind: 'text' | 'forum' | 'thread' | 'voice' | 'other';
  parentId: string | null;
}

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline';

/** 방 안에 있는 (봇이 아닌) 멤버 한 명. games = 보이는 "게임 중" 활동 (없으면 빈 배열) */
export interface RoomOccupant {
  userId: string;
  games: string[];
}

/** 봇이 켜질 때 디스코드에서 읽어온 현재 상태 */
export interface GuildSnapshot {
  members: MemberInfo[];
  channels: ChannelInfo[];
  /** 지금 음성 채널에 있는 멤버 */
  voice: { userId: string; channelId: string; channelName: string }[];
  presences: { userId: string; status: PresenceStatus; games: string[] }[];
  /** 사람이 있는 음성 채널 */
  rooms: { channelId: string; channelName: string; occupants: RoomOccupant[] }[];
}

type IntervalTable = typeof voiceSessions | typeof presenceSessions | typeof activitySessions | typeof voiceRoomStates;

export class Tracker {
  constructor(
    private readonly db: Database,
    readonly guildId: string,
  ) {}

  // ─── 공통 ───────────────────────────────────────────────

  /**
   * 열린 구간을 at에 닫는다. 시작보다 이른 시각으로 닫히지 않게 greatest 처리.
   * 네 테이블 모두 guild_id / started_at / ended_at 컬럼이 같아서 한 타입으로 다룬다.
   */
  private async closeOpen(table: IntervalTable, where: SQL | undefined, at: Date) {
    const t = table as typeof voiceSessions;
    await this.db
      .update(t)
      .set({ endedAt: sql`greatest(${t.startedAt}, ${at.toISOString()}::timestamptz)` })
      .where(and(eq(t.guildId, this.guildId), isNull(t.endedAt), where));
  }

  // ─── 멤버 ───────────────────────────────────────────────

  async upsertMembers(list: MemberInfo[], at: Date) {
    for (let i = 0; i < list.length; i += 500) {
      const chunk = list.slice(i, i + 500);
      if (chunk.length === 0) continue;
      await this.db
        .insert(members)
        .values(chunk.map((m) => ({ guildId: this.guildId, ...m, leftAt: null, updatedAt: at })))
        .onConflictDoUpdate({
          target: [members.guildId, members.userId],
          set: {
            username: sql`excluded.username`,
            displayName: sql`excluded.display_name`,
            avatarUrl: sql`excluded.avatar_url`,
            isBot: sql`excluded.is_bot`,
            joinedAt: sql`excluded.joined_at`,
            leftAt: null,
            updatedAt: at,
          },
        });
    }
  }

  /** 서버를 나간 멤버: 표시용 정보는 남기고 열린 구간은 모두 닫는다 */
  async markMemberLeft(userId: string, at: Date) {
    await this.db
      .update(members)
      .set({ leftAt: at, updatedAt: at })
      .where(and(eq(members.guildId, this.guildId), eq(members.userId, userId)));
    await this.closeVoice(userId, at);
    await this.setPresence(userId, 'offline', at);
    await this.setActivities(userId, [], at);
  }

  async touchLastSeen(userIds: string[], at: Date) {
    if (userIds.length === 0) return;
    await this.db
      .update(members)
      .set({ lastSeenAt: at })
      .where(and(eq(members.guildId, this.guildId), inArray(members.userId, userIds)));
  }

  // ─── 음성 ───────────────────────────────────────────────

  /** 입장/이동: 기존 열린 세션을 닫고 새로 연다 (유저당 열린 세션은 1개) */
  async openVoice(userId: string, channelId: string, channelName: string, at: Date) {
    await this.closeVoice(userId, at);
    await this.db.insert(voiceSessions).values({ guildId: this.guildId, userId, channelId, channelName, startedAt: at });
  }

  async closeVoice(userId: string, at: Date) {
    await this.closeOpen(voiceSessions, eq(voiceSessions.userId, userId), at);
  }

  // ─── 온라인 상태 / 게임 ─────────────────────────────────

  async setPresence(userId: string, status: PresenceStatus, at: Date) {
    const [open] = await this.db
      .select({ status: presenceSessions.status })
      .from(presenceSessions)
      .where(
        and(
          eq(presenceSessions.guildId, this.guildId),
          eq(presenceSessions.userId, userId),
          isNull(presenceSessions.endedAt),
        ),
      );
    if (open?.status === status) return;
    if (!open && status === 'offline') return;

    await this.closeOpen(presenceSessions, eq(presenceSessions.userId, userId), at);
    if (status !== 'offline') {
      await this.db.insert(presenceSessions).values({ guildId: this.guildId, userId, status, startedAt: at });
    }
  }

  /** 현재 하고 있는 게임 목록과 열린 게임 구간을 맞춘다 (끝난 게임은 닫고 새 게임은 연다) */
  async setActivities(userId: string, games: string[], at: Date) {
    const current = new Set(games.map((g) => g.trim()).filter(Boolean));
    const open = await this.db
      .select({ id: activitySessions.id, name: activitySessions.activityName })
      .from(activitySessions)
      .where(
        and(
          eq(activitySessions.guildId, this.guildId),
          eq(activitySessions.userId, userId),
          isNull(activitySessions.endedAt),
        ),
      );

    const ended = open.filter((o) => !current.has(o.name)).map((o) => o.id);
    if (ended.length > 0) await this.closeOpen(activitySessions, inArray(activitySessions.id, ended), at);

    const openNames = new Set(open.map((o) => o.name));
    const started = [...current].filter((g) => !openNames.has(g));
    if (started.length > 0) {
      await this.db
        .insert(activitySessions)
        .values(started.map((activityName) => ({ guildId: this.guildId, userId, activityName, startedAt: at })));
    }
  }

  // ─── 방 종류 ────────────────────────────────────────────

  /**
   * 방(음성 채널) 종류를 다시 판정한다. 인원/게임/방 제목이 바뀔 때마다 호출.
   * 결과가 같으면 그대로 두고(제목만 갱신), 다르면 구간을 닫고 새로 연다. 아무도 없으면 닫는다.
   */
  async refreshRoom(channelId: string, channelName: string, occupants: RoomOccupant[], at: Date) {
    const [open] = await this.db
      .select({
        id: voiceRoomStates.id,
        kind: voiceRoomStates.categoryKind,
        label: voiceRoomStates.categoryLabel,
        name: voiceRoomStates.channelName,
      })
      .from(voiceRoomStates)
      .where(
        and(
          eq(voiceRoomStates.guildId, this.guildId),
          eq(voiceRoomStates.channelId, channelId),
          isNull(voiceRoomStates.endedAt),
        ),
      );

    const roomFilter = eq(voiceRoomStates.channelId, channelId);
    if (occupants.length === 0) {
      if (open) await this.closeOpen(voiceRoomStates, roomFilter, at);
      return;
    }

    // 1인 1게임: 여러 게임을 동시에 켜둔 멤버는 첫 번째 게임만 센다
    const games = occupants.map((o) => o.games[0]).filter((g): g is string => Boolean(g));
    const category = classifyRoom(channelName, games, open?.label);

    if (open && open.kind === category.kind && open.label === category.label) {
      if (open.name !== channelName) {
        await this.db.update(voiceRoomStates).set({ channelName }).where(eq(voiceRoomStates.id, open.id));
      }
      return;
    }

    if (open) await this.closeOpen(voiceRoomStates, roomFilter, at);
    await this.db.insert(voiceRoomStates).values({
      guildId: this.guildId,
      channelId,
      channelName,
      categoryKind: category.kind,
      categoryLabel: category.label,
      startedAt: at,
    });
  }

  // ─── 채널 / 메시지 ──────────────────────────────────────

  async upsertChannels(list: ChannelInfo[], at: Date) {
    for (let i = 0; i < list.length; i += 500) {
      const chunk = list.slice(i, i + 500);
      if (chunk.length === 0) continue;
      await this.db
        .insert(channels)
        .values(chunk.map((c) => ({ guildId: this.guildId, ...c, updatedAt: at })))
        .onConflictDoUpdate({
          target: [channels.guildId, channels.channelId],
          set: {
            name: sql`excluded.name`,
            kind: sql`excluded.kind`,
            parentId: sql`excluded.parent_id`,
            updatedAt: at,
          },
        });
    }
  }

  /** 메시지 1개 (내용은 저장하지 않음). KST 날짜별로 누적 */
  async countMessage(userId: string, channelId: string, at: Date) {
    await this.db
      .insert(messageCountsDaily)
      .values({ guildId: this.guildId, userId, channelId, day: kstDayKey(at), count: 1 })
      .onConflictDoUpdate({
        target: [messageCountsDaily.guildId, messageCountsDaily.userId, messageCountsDaily.channelId, messageCountsDaily.day],
        set: { count: sql`${messageCountsDaily.count} + 1` },
      });
  }

  // ─── 봇 생명주기 ────────────────────────────────────────

  async heartbeat(at: Date) {
    await this.db
      .insert(botStatus)
      .values({ guildId: this.guildId, startedAt: at, lastHeartbeatAt: at })
      .onConflictDoUpdate({ target: botStatus.guildId, set: { lastHeartbeatAt: at } });
  }

  private async closeAllOpen(at: Date) {
    for (const table of [voiceSessions, presenceSessions, activitySessions, voiceRoomStates] as const) {
      await this.closeOpen(table, undefined, at);
    }
  }

  /**
   * 봇 시작 시: 이전 실행에서 열린 채로 남은 구간을 마지막 하트비트 시각에 닫고
   * (꺼져 있던 동안은 알 수 없으므로 집계하지 않는다), 지금 상태로 새 구간을 연다.
   */
  async recover(snapshot: GuildSnapshot, at: Date) {
    const [status] = await this.db
      .select({ lastHeartbeatAt: botStatus.lastHeartbeatAt })
      .from(botStatus)
      .where(eq(botStatus.guildId, this.guildId));
    const closeAt = status && status.lastHeartbeatAt < at ? status.lastHeartbeatAt : at;

    await this.db.transaction(async (tx) => {
      const scoped = new Tracker(tx as unknown as Database, this.guildId);
      await scoped.closeAllOpen(closeAt);
      await scoped.upsertMembers(snapshot.members, at);
      await scoped.upsertChannels(snapshot.channels, at);
      for (const v of snapshot.voice) await scoped.openVoice(v.userId, v.channelId, v.channelName, at);
      for (const p of snapshot.presences) {
        await scoped.setPresence(p.userId, p.status, at);
        await scoped.setActivities(p.userId, p.status === 'offline' ? [] : p.games, at);
      }
      for (const r of snapshot.rooms) await scoped.refreshRoom(r.channelId, r.channelName, r.occupants, at);
      const online = snapshot.presences.filter((p) => p.status !== 'offline').map((p) => p.userId);
      await scoped.touchLastSeen([...new Set([...online, ...snapshot.voice.map((v) => v.userId)])], at);
      await tx
        .insert(botStatus)
        .values({ guildId: this.guildId, startedAt: at, lastHeartbeatAt: at })
        .onConflictDoUpdate({ target: botStatus.guildId, set: { startedAt: at, lastHeartbeatAt: at } });
    });
  }

  /** 정상 종료 시: 열린 구간을 지금 시각으로 닫는다 */
  async shutdown(at: Date) {
    await this.closeAllOpen(at);
    await this.heartbeat(at);
  }
}

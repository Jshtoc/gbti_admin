import {
  ActivityType,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type Channel,
  type Guild,
  type GuildMember,
  type PartialGuildMember,
  type Presence,
  type VoiceBasedChannel,
} from 'discord.js';

import { normalizeGameName } from '@gbti/db/roomCategory';

import { createSerialQueue } from './queue';
import type { ChannelInfo, GuildSnapshot, MemberInfo, PresenceStatus, RoomOccupant, Tracker } from './tracker';

// 디스코드 이벤트 → Tracker 호출.
// 이벤트가 온 "그 순간"의 상태(방 인원, 보이는 게임)를 여기서 읽어 값으로 넘기고, DB 작업은 큐에서 순서대로 실행한다.

const HEARTBEAT_MS = 60_000;

// ─── 디스코드 객체 → 기록용 값 ──────────────────────────────

function toMemberInfo(member: GuildMember): MemberInfo {
  return {
    userId: member.id,
    username: member.user.username,
    displayName: member.displayName,
    avatarUrl: member.displayAvatarURL({ size: 128 }),
    isBot: member.user.bot,
    joinedAt: member.joinedAt,
  };
}

function presenceStatus(presence: Presence | null | undefined): PresenceStatus {
  const status = presence?.status;
  return status === 'online' || status === 'idle' || status === 'dnd' ? status : 'offline';
}

/** "게임 중" 활동만 (음악 듣는 중, 사용자 지정 상태, 방송 등은 제외). 런처 이름은 실제 게임으로 묶는다 */
function playingGames(presence: Presence | null | undefined): string[] {
  if (!presence || presenceStatus(presence) === 'offline') return [];
  const names = presence.activities.filter((a) => a.type === ActivityType.Playing).map((a) => normalizeGameName(a.name));
  return [...new Set(names)];
}

function roomOccupants(channel: VoiceBasedChannel): RoomOccupant[] {
  return [...channel.members.values()]
    .filter((m) => !m.user.bot)
    .map((m) => ({ userId: m.id, games: playingGames(m.presence) }));
}

function channelKind(channel: Channel): ChannelInfo['kind'] {
  switch (channel.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement:
      return 'text';
    case ChannelType.GuildForum:
    case ChannelType.GuildMedia:
      return 'forum';
    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
    case ChannelType.AnnouncementThread:
      return 'thread';
    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice:
      return 'voice';
    default:
      return 'other';
  }
}

/** 메시지를 셀 수 있는 채널(카테고리 제외)만 기록 */
function toChannelInfo(channel: Channel): ChannelInfo | null {
  if (channel.isDMBased() || channel.type === ChannelType.GuildCategory) return null;
  return {
    channelId: channel.id,
    name: channel.name,
    kind: channelKind(channel),
    parentId: channel.isThread() ? channel.parentId : null,
  };
}

async function readSnapshot(guild: Guild): Promise<GuildSnapshot> {
  const allMembers = await guild.members.fetch({ withPresences: true });
  const fetchedChannels = await guild.channels.fetch();
  const { threads } = await guild.channels.fetchActiveThreads();

  const channelInfos = [...fetchedChannels.values(), ...threads.values()]
    .map((c) => (c ? toChannelInfo(c) : null))
    .filter((c): c is ChannelInfo => c !== null);

  const humans = [...allMembers.values()].filter((m) => !m.user.bot);
  const voice = humans
    .filter((m) => m.voice.channel)
    .map((m) => ({ userId: m.id, channelId: m.voice.channel!.id, channelName: m.voice.channel!.name }));

  const rooms = [...fetchedChannels.values()]
    .filter((c): c is VoiceBasedChannel => c !== null && c.isVoiceBased())
    .map((c) => ({ channelId: c.id, channelName: c.name, occupants: roomOccupants(c) }))
    .filter((r) => r.occupants.length > 0);

  return {
    members: [...allMembers.values()].map(toMemberInfo),
    channels: channelInfos,
    voice,
    presences: humans.map((m) => ({ userId: m.id, status: presenceStatus(m.presence), games: playingGames(m.presence) })),
    rooms,
  };
}

// ─── 봇 ─────────────────────────────────────────────────────

export function createBot(tracker: Tracker) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // 특권 인텐트: 멤버 목록
      GatewayIntentBits.GuildPresences, // 특권 인텐트: 온라인 상태 / 게임
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages, // 메시지 "개수"만 센다 (Message Content 인텐트 불필요)
    ],
  });
  const queue = createSerialQueue();
  const knownChannels = new Set<string>();
  /**
   * 멤버별 마지막으로 기록한 상태·게임. 디스코드는 게임 상세 문구만 바뀌어도 상태 변경 이벤트를 자주 보내므로,
   * 기록할 내용이 실제로 바뀐 경우에만 DB에 쓴다 (봇 서버와 DB가 멀어도 큐가 밀리지 않게).
   */
  const lastPresence = new Map<string, { status: PresenceStatus; gamesKey: string }>();
  const gamesKeyOf = (games: string[]) => [...games].sort().join('\u0000');
  let heartbeatTimer: NodeJS.Timeout | undefined;
  let initialized = false;

  const isOurGuild = (guildId: string | null | undefined) => guildId === tracker.guildId;

  const refreshRoom = (channel: VoiceBasedChannel | null, at: Date) => {
    if (!channel) return;
    const occupants = roomOccupants(channel);
    const name = channel.name;
    void queue.enqueue(`room ${name}`, () => tracker.refreshRoom(channel.id, name, occupants, at));
  };

  const recover = async (reason: string) => {
    const guild = await client.guilds.fetch(tracker.guildId);
    const snapshot = await readSnapshot(guild);
    const at = new Date();
    for (const c of snapshot.channels) knownChannels.add(c.channelId);
    lastPresence.clear();
    for (const p of snapshot.presences) lastPresence.set(p.userId, { status: p.status, gamesKey: gamesKeyOf(p.games) });
    await queue.enqueue(`recover (${reason})`, () => tracker.recover(snapshot, at));
    console.log(
      `[bot] ${reason}: ${guild.name} · 멤버 ${snapshot.members.length} · 음성 ${snapshot.voice.length} · 사용 중인 방 ${snapshot.rooms.length}`,
    );
  };

  client.once(Events.ClientReady, async (c) => {
    console.log(`[bot] 로그인: ${c.user.tag}`);
    try {
      await recover('시작');
    } catch (error) {
      console.error('[bot] 서버 정보를 읽지 못했습니다. DISCORD_GUILD_ID와 봇 초대 여부를 확인하세요.', error);
      process.exit(1);
    }
    initialized = true;

    heartbeatTimer = setInterval(() => {
      const at = new Date();
      const guild = client.guilds.cache.get(tracker.guildId);
      const active = guild
        ? [...guild.members.cache.values()]
            .filter((m) => !m.user.bot && (presenceStatus(m.presence) !== 'offline' || m.voice.channelId))
            .map((m) => m.id)
        : [];
      // 온라인/음성 중인 멤버의 마지막 접속은 여기서 1분마다 한꺼번에 갱신한다
      void queue.enqueue('heartbeat', async () => {
        await tracker.heartbeat(at);
        await tracker.touchLastSeen(active, at);
      });
      if (queue.size() > 50) console.warn(`[bot] DB 작업이 밀리고 있습니다 (대기 ${queue.size()}개)`);
    }, HEARTBEAT_MS);
  });

  // 연결이 끊겼다가 세션을 새로 시작하면 그 사이 이벤트를 놓쳤을 수 있으니 다시 맞춘다
  client.on(Events.ShardReady, () => {
    if (!initialized) return;
    recover('재연결').catch((error) => console.error('[bot] 재연결 복구 실패:', error));
  });

  // ─── 멤버 ───
  client.on(Events.GuildMemberAdd, (member) => {
    if (!isOurGuild(member.guild.id)) return;
    const info = toMemberInfo(member);
    void queue.enqueue('member add', () => tracker.upsertMembers([info], new Date()));
  });

  client.on(Events.GuildMemberUpdate, (_old, member) => {
    if (!isOurGuild(member.guild.id)) return;
    const info = toMemberInfo(member);
    void queue.enqueue('member update', () => tracker.upsertMembers([info], new Date()));
  });

  client.on(Events.GuildMemberRemove, (member: GuildMember | PartialGuildMember) => {
    if (!isOurGuild(member.guild.id)) return;
    const at = new Date();
    lastPresence.delete(member.id);
    void queue.enqueue('member remove', () => tracker.markMemberLeft(member.id, at));
  });

  // ─── 음성 ───
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (!isOurGuild(newState.guild.id) || newState.member?.user.bot) return;
    if (oldState.channelId === newState.channelId) return; // 음소거 등 같은 방 안의 변화
    const at = new Date();
    const userId = newState.id;
    const joined = newState.channel;

    if (joined) {
      const name = joined.name;
      void queue.enqueue('voice join', () => tracker.openVoice(userId, joined.id, name, at));
    } else {
      void queue.enqueue('voice leave', () => tracker.closeVoice(userId, at));
    }
    void queue.enqueue('last seen', () => tracker.touchLastSeen([userId], at));
    refreshRoom(oldState.channel, at);
    refreshRoom(joined, at);
  });

  // ─── 온라인 상태 / 게임 ───
  client.on(Events.PresenceUpdate, (_old, presence) => {
    if (!isOurGuild(presence.guild?.id) || presence.user?.bot || presence.member?.user.bot) return;
    const userId = presence.userId;
    const status = presenceStatus(presence);
    const games = playingGames(presence);
    const gamesKey = gamesKeyOf(games);

    // 상태도 게임도 그대로면(게임 상세 문구만 바뀐 경우 등) 기록할 게 없다
    const prev = lastPresence.get(userId);
    if (prev && prev.status === status && prev.gamesKey === gamesKey) return;
    lastPresence.set(userId, { status, gamesKey });

    const at = new Date();
    void queue.enqueue('presence', async () => {
      if (prev?.status !== status) await tracker.setPresence(userId, status, at);
      if (prev?.gamesKey !== gamesKey) await tracker.setActivities(userId, games, at);
      // 오프라인이 된 순간이 마지막 접속 (온라인 중에는 하트비트가 갱신)
      if (status === 'offline') await tracker.touchLastSeen([userId], at);
    });
    // 게임이 바뀌었고 음성 채널에 있으면 그 방의 종류가 바뀔 수 있다
    if (prev?.gamesKey !== gamesKey) refreshRoom(presence.member?.voice.channel ?? null, at);
  });

  // ─── 채널 ───
  const upsertChannel = (channel: Channel, label: string) => {
    const info = toChannelInfo(channel);
    if (!info) return;
    knownChannels.add(info.channelId);
    void queue.enqueue(label, () => tracker.upsertChannels([info], new Date()));
  };

  client.on(Events.ChannelCreate, (channel) => {
    if (isOurGuild(channel.guild.id)) upsertChannel(channel, 'channel create');
  });

  client.on(Events.ChannelUpdate, (_old, channel) => {
    if (channel.isDMBased() || !isOurGuild(channel.guild.id)) return;
    upsertChannel(channel, 'channel update');
    // 방 제목이 바뀌면 '할하방' 키워드 판정이 달라질 수 있다
    if (channel.isVoiceBased()) refreshRoom(channel, new Date());
  });

  client.on(Events.ThreadCreate, (thread) => {
    if (isOurGuild(thread.guild.id)) upsertChannel(thread, 'thread create');
  });

  client.on(Events.ThreadUpdate, (_old, thread) => {
    if (isOurGuild(thread.guild.id)) upsertChannel(thread, 'thread update');
  });

  // ─── 메시지 (개수만) ───
  client.on(Events.MessageCreate, (message) => {
    if (!message.inGuild() || !isOurGuild(message.guildId) || message.author.bot) return;
    const at = new Date();
    const channel = message.channel;

    // 처음 보는 채널(새 스레드 등)은 이름/상위 채널을 먼저 기록
    if (!knownChannels.has(channel.id)) {
      if (channel.isThread() && channel.parent && !knownChannels.has(channel.parent.id)) {
        upsertChannel(channel.parent, 'channel (parent)');
      }
      upsertChannel(channel, 'channel (message)');
    }
    const userId = message.author.id;
    // 메시지를 보내는 멤버는 온라인이라 마지막 접속은 하트비트가 갱신한다
    void queue.enqueue('message', () => tracker.countMessage(userId, channel.id, at));
  });

  client.on(Events.Error, (error) => console.error('[bot] discord 오류:', error));

  /** 정상 종료: 열린 구간을 지금 시각으로 닫고 연결을 끊는다 */
  async function stop() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    const at = new Date();
    await queue.enqueue('shutdown', () => tracker.shutdown(at));
    await queue.drain();
    await client.destroy();
  }

  return { client, stop };
}

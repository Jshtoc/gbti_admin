import type {
  CoPlayPair,
  DailyVoice,
  DateRange,
  GameTime,
  MemberActivity,
  MessageChannelCount,
  PartnerTime,
  RoomCategoryTime,
  VoiceSessionRow,
} from '@gbti/db';

/** 대시보드 데이터 소스. 목데이터와 PostgreSQL 구현이 같은 계약을 따른다. */
export interface DashboardRepository {
  getMemberActivity(range: DateRange): Promise<MemberActivity[]>;
  getCoPlayPairs(range: DateRange, limit?: number): Promise<CoPlayPair[]>;
  getPartners(userId: string, range: DateRange, limit?: number): Promise<PartnerTime[]>;
  getDailyVoice(range: DateRange, userId?: string): Promise<DailyVoice[]>;
  getGameTimes(userId: string, range: DateRange): Promise<GameTime[]>;
  getRecentVoiceSessions(userId: string, limit?: number): Promise<VoiceSessionRow[]>;
  /** 방 종류별 체류 시간. userId를 주면 그 멤버만 */
  getRoomCategoryTimes(range: DateRange, userId?: string): Promise<RoomCategoryTime[]>;
  /** 채널(스레드 포함)별 메시지 수. userId를 주면 그 멤버만 */
  getMessageChannelCounts(range: DateRange, userId?: string): Promise<MessageChannelCount[]>;
}

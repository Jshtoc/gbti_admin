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
} from '@gbti/db';

/** 대시보드 데이터 소스. 목데이터와 PostgreSQL 구현이 같은 계약을 따른다. */
export interface DashboardRepository {
  /** 멤버 검색/선택용 가벼운 목록 (집계 없음) */
  getMembers(): Promise<MemberListItem[]>;
  getMemberActivity(range: DateRange): Promise<MemberActivity[]>;
  getCoPlayPairs(range: DateRange, limit?: number): Promise<CoPlayPair[]>;
  getPartners(userId: string, range: DateRange, limit?: number): Promise<PartnerTime[]>;
  getDailyVoice(range: DateRange, userId?: string): Promise<DailyVoice[]>;
  getGameTimes(userId: string, range: DateRange): Promise<GameTime[]>;
  getRecentVoiceSessions(userId: string, limit?: number): Promise<VoiceSessionRow[]>;
  /** 방 종류별 체류 시간. userId를 주면 그 멤버만 */
  getRoomCategoryTimes(range: DateRange, userId?: string): Promise<RoomCategoryTime[]>;
}

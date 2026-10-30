import type {
  CoPlayPair,
  DailyVoice,
  DateRange,
  GameTime,
  MemberActivity,
  MemberAvgJoin,
  MemberIdle,
  MemberLastVoice,
  MemberListItem,
  MemberOffUser,
  PairTime,
  PartnerTime,
  VoiceSessionGroup,
} from '@gbti/db';

/** 대시보드 데이터 소스. 목데이터와 PostgreSQL 구현이 같은 계약을 따른다. */
export interface DashboardRepository {
  /** 멤버 검색/선택용 가벼운 목록 (집계 없음) */
  getMembers(): Promise<MemberListItem[]>;
  getMemberActivity(range: DateRange): Promise<MemberActivity[]>;
  /** 멤버별 마지막 음성방 퇴장 시각 (보관 기간 안 기록 기준) */
  getLastVoiceExits(): Promise<MemberLastVoice[]>;
  /** 온라인 상태가 아닌데 음성방에 있거나 채팅을 친 멤버 (최근 순) */
  getOffUsers(): Promise<MemberOffUser[]>;
  /** 멤버별 최근 FIRST_JOIN_DAYS일 평균 첫 음성방 입장 시각 */
  getAverageFirstJoins(): Promise<MemberAvgJoin[]>;
  /** 멤버별 음성 시간과 그중 잠수(마이크 끈) 시간 */
  getMemberIdle(range: DateRange): Promise<MemberIdle[]>;
  getCoPlayPairs(range: DateRange, limit?: number): Promise<CoPlayPair[]>;
  /** 두 멤버가 같은 음성 채널에 함께 있던 시간. 멤버가 없거나 듀오 집계 제외면 null */
  getPairTime(aId: string, bId: string, range: DateRange): Promise<PairTime | null>;
  getPartners(userId: string, range: DateRange, limit?: number): Promise<PartnerTime[]>;
  getDailyVoice(range: DateRange, userId?: string): Promise<DailyVoice[]>;
  getGameTimes(userId: string, range: DateRange): Promise<GameTime[]>;
  /** 음성 세션을 방제목별로 묶은 것 (조회 기간 안, 최근 순) */
  getVoiceSessionGroups(userId: string, range: DateRange, limit?: number): Promise<VoiceSessionGroup[]>;
}

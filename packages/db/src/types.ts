// 대시보드가 읽는 집계 결과(read model). 목데이터/DB 구현이 같은 타입을 반환한다.

/** 반열린 구간 [from, to) */
export interface DateRange {
  from: Date;
  to: Date;
}

export interface MemberRef {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

/** 멤버 검색/선택용 */
export interface MemberListItem extends MemberRef {
  username: string;
}

export interface MemberActivity extends MemberRef {
  username: string;
  voiceSeconds: number;
  onlineSeconds: number;
  topGame: string | null;
  lastSeenAt: Date | null;
}

export interface CoPlayPair {
  a: MemberRef;
  b: MemberRef;
  seconds: number;
}

export interface PartnerTime {
  partner: MemberRef;
  seconds: number;
}

export interface DailyVoice {
  /** Asia/Seoul 기준 YYYY-MM-DD */
  day: string;
  seconds: number;
}

export interface GameTime {
  activityName: string;
  seconds: number;
}

/** 방 종류별 체류 시간 (멤버별 체류 시간의 합 = 인원 × 시간) */
export interface RoomCategoryTime {
  kind: 'hangout' | 'game' | 'unknown';
  label: string;
  seconds: number;
}

export interface VoiceSessionRow {
  id: number;
  channelName: string;
  startedAt: Date;
  endedAt: Date | null;
}

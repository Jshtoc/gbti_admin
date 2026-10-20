// "평균 접속 시간대": 멤버별로 하루의 첫 음성방 입장 시각을 최근 N일 평균낸다.
// 새벽(자정 이후)에 노는 멤버가 평균에서 튀지 않도록 하루를 KST 06:00 에 끊는다 (00:30 입장 = 전날 밤의 연장).
export const FIRST_JOIN_DAYS = 7;
export const FIRST_JOIN_DAY_START_HOUR = 6;

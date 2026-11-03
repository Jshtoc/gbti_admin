// 멤버 정보 TXT 내보내기 형식 (멤버 한 명 = 4줄, 멤버 사이는 --- 한 줄, 위아래 빈 줄)
//   이름 : 냥구 96
//   롤 ID : 무빙없어요#KR1
//   스팀 ID : ㅁㅁ
//   배그 ID : ㅁㅁ
//   로블록스 ID : ㅁㅁ
//   오버워치 ID : ㅁㅁ

export interface AccountTxtEntry {
  name: string;
  lolId: string;
  steamId: string;
  pubgId: string;
  robloxId: string;
  overwatchId: string;
}

/** 이름 비교용: 대괄호 태그를 빼고 공백을 정리한다 */
export function normalizeName(displayName: string): string {
  return displayName
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}

export function formatAccountsTxt(entries: AccountTxtEntry[]): string {
  return (
    entries
      .map(
        (e) =>
          `이름 : ${e.name}\n롤 ID : ${e.lolId}\n스팀 ID : ${e.steamId}\n배그 ID : ${e.pubgId}\n로블록스 ID : ${e.robloxId}\n오버워치 ID : ${e.overwatchId}`,
      )
      .join('\n\n---\n\n') + '\n'
  );
}

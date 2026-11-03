// 멤버 정보 TXT 형식 (멤버 한 명 = 4줄, 멤버 사이는 --- 한 줄)
//   이름 : 냥구 96
//   롤 ID : 무빙없어요#KR1
//   스팀 ID : ㅁㅁ
//   배그 ID : ㅁㅁ

export interface AccountTxtEntry {
  name: string;
  lolId: string;
  steamId: string;
  pubgId: string;
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
      .map((e) => `이름 : ${e.name}\n롤 ID : ${e.lolId}\n스팀 ID : ${e.steamId}\n배그 ID : ${e.pubgId}`)
      .join('\n\n---\n\n') + '\n'
  );
}

const FIELD_KEYS: Record<string, keyof AccountTxtEntry> = {
  이름: 'name',
  '롤 ID': 'lolId',
  '스팀 ID': 'steamId',
  '배그 ID': 'pubgId',
};

export interface ParsedAccountsTxt {
  entries: AccountTxtEntry[];
  /** 이름 줄이 없어 읽지 못한 블록 수 */
  invalidBlocks: number;
}

export function parseAccountsTxt(text: string): ParsedAccountsTxt {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    if (/^\s*-{3,}\s*$/.test(line)) {
      blocks.push(current);
      current = [];
    } else current.push(line);
  }
  blocks.push(current);

  const entries: AccountTxtEntry[] = [];
  let invalidBlocks = 0;

  for (const lines of blocks) {
    if (lines.every((l) => !l.trim())) continue;
    const entry: AccountTxtEntry = { name: '', lolId: '', steamId: '', pubgId: '' };
    for (const line of lines) {
      const m = line.match(/^\s*([^:：]+?)\s*[:：]\s*(.*?)\s*$/);
      const key = m?.[1] ? FIELD_KEYS[m[1].replace(/\s+/g, ' ')] : undefined;
      if (m && key) entry[key] = m[2] ?? '';
    }
    entry.name = normalizeName(entry.name);
    if (entry.name) entries.push(entry);
    else invalidBlocks += 1;
  }
  return { entries, invalidBlocks };
}

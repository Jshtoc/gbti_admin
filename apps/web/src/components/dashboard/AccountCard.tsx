'use client';

import { useState } from 'react';

import styles from './AccountCard.module.css';

interface AccountCardProps {
  /** 닉네임 (대괄호 태그는 복사할 때 뺀다) */
  displayName: string;
  lolId: string;
  steamId: string;
  pubgId: string;
}

const KICK_MESSAGE = '친구삭제 부탁드립니다.\n몰랐습니다 깜박했어요 안됩니다.';

type Copied = 'account' | 'kick' | null;

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 멤버의 게임 계정 정보 + 복사 버튼 (계정정보 복사 / 퇴출 복사) */
export function AccountCard({ displayName, lolId, steamId, pubgId }: AccountCardProps) {
  const [copied, setCopied] = useState<Copied>(null);
  const name = displayName.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

  const idLines = `롤 ID : ${lolId}\n스팀 ID : ${steamId}\n배그 ID : ${pubgId}`;
  const accountText = `이름 : ${name}\n${idLines}`;
  const kickText = `${idLines}\n\n${KICK_MESSAGE}`;

  const copy = async (kind: Exclude<Copied, null>, text: string) => {
    if (!(await writeClipboard(text))) return;
    setCopied(kind);
    setTimeout(() => setCopied((cur) => (cur === kind ? null : cur)), 1500);
  };

  const rows: [string, string][] = [
    ['롤 ID', lolId],
    ['스팀 ID', steamId],
    ['배그 ID', pubgId],
  ];

  return (
    <section className={styles.card} aria-label="계정 정보">
      <dl className={styles.list}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt>{label}</dt>
            <dd className={value ? undefined : styles.empty}>{value || '-'}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={() => copy('account', accountText)}>
          {copied === 'account' ? '복사됨' : '계정정보 복사'}
        </button>
        <button type="button" className={styles.btn} onClick={() => copy('kick', kickText)}>
          {copied === 'kick' ? '복사됨' : '퇴출 복사'}
        </button>
      </div>
    </section>
  );
}

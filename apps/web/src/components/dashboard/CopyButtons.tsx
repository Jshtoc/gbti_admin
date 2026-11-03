'use client';

import { useState } from 'react';

import { buildAccountText, buildKickText, writeClipboard, type AccountIds } from '@/lib/accountCopy';

import styles from './AccountCard.module.css';

type Copied = 'account' | 'kick' | null;

interface CopyButtonsProps extends AccountIds {
  /** 닉네임 (대괄호 태그는 복사할 때 뺀다) */
  displayName: string;
}

/** 계정정보 복사 / 퇴출 복사 버튼 (멤버 상세 카드, 탈퇴 유저 목록 공용) */
export function CopyButtons({ displayName, ...ids }: CopyButtonsProps) {
  const [copied, setCopied] = useState<Copied>(null);

  const copy = async (kind: Exclude<Copied, null>, text: string) => {
    if (!(await writeClipboard(text))) return;
    setCopied(kind);
    setTimeout(() => setCopied((cur) => (cur === kind ? null : cur)), 1500);
  };

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.btn} onClick={() => copy('account', buildAccountText(displayName, ids))}>
        {copied === 'account' ? '복사됨' : '계정정보 복사'}
      </button>
      <button type="button" className={styles.btn} onClick={() => copy('kick', buildKickText(ids))}>
        {copied === 'kick' ? '복사됨' : '퇴출 복사'}
      </button>
    </div>
  );
}

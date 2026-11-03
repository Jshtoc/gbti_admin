import { accountRows, type AccountIds } from '@/lib/accountCopy';

import { CopyButtons } from './CopyButtons';
import styles from './AccountCard.module.css';

interface AccountCardProps extends AccountIds {
  /** 닉네임 (대괄호 태그는 복사할 때 뺀다) */
  displayName: string;
}

/** 멤버의 게임 계정 정보 + 복사 버튼 (계정정보 복사 / 퇴출 복사) */
export function AccountCard({ displayName, ...ids }: AccountCardProps) {
  return (
    <section className={styles.card} aria-label="계정 정보">
      <dl className={styles.list}>
        {accountRows(ids).map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt>{label}</dt>
            <dd className={value ? undefined : styles.empty}>{value || '-'}</dd>
          </div>
        ))}
      </dl>
      <CopyButtons displayName={displayName} {...ids} />
    </section>
  );
}

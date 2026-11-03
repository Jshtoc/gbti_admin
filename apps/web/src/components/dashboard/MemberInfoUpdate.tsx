'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import styles from './MemberInfoUpdate.module.css';

interface SyncResult {
  posts: number;
  updated: number;
  unmatched: string[];
  ambiguous: string[];
}

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; message: string } | { kind: 'done'; result: SyncResult };

/** "멤버 정보" 버튼 + 팝업 (TXT 다운로드 / 잡담금 스레드로 멤버 정보 업데이트). 제한 계정에서만 렌더된다 */
export function MemberInfoUpdate() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const open = () => {
    setStatus({ kind: 'idle' });
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  const sync = async () => {
    setStatus({ kind: 'busy' });
    try {
      const res = await fetch('/api/member-accounts/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setStatus({ kind: 'error', message: data.error ?? '업데이트에 실패했습니다.' });
      else {
        setStatus({ kind: 'done', result: data });
        router.refresh();
      }
    } catch {
      setStatus({ kind: 'error', message: '업데이트에 실패했습니다.' });
    }
  };

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open}>
        멤버 정보
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="member-info-title">
        <h3 id="member-info-title" className={styles.title}>
          멤버 정보
        </h3>
        <p className={styles.desc}>
          업데이트는 잡담금 스레드에 올라온 글(닉네임·스팀·배그·롤)을 읽어 멤버 정보에 반영합니다. 글이 없는 멤버와 비어
          있는 항목은 그대로 둡니다.
        </p>

        <div className={styles.actions}>
          <a className={styles.btn} href="/api/member-accounts" download>
            멤버 목록 TXT 파일 다운로드
          </a>
          <button type="button" className={styles.btn} disabled={status.kind === 'busy'} onClick={sync}>
            {status.kind === 'busy' ? '업데이트 중…' : '멤버 정보 업데이트'}
          </button>
        </div>

        {status.kind === 'error' && <p className={styles.error}>{status.message}</p>}
        {status.kind === 'done' && (
          <div className={styles.result}>
            <p>
              글 {status.result.posts}개 중 {status.result.updated}명 반영했습니다.
            </p>
            {status.result.unmatched.length > 0 && (
              <p className={styles.warn}>멤버를 찾지 못함: {status.result.unmatched.join(', ')}</p>
            )}
            {status.result.ambiguous.length > 0 && (
              <p className={styles.warn}>이름이 겹쳐 건너뜀: {status.result.ambiguous.join(', ')}</p>
            )}
          </div>
        )}

        <button type="button" className={styles.close} onClick={close}>
          닫기
        </button>
      </dialog>
    </>
  );
}

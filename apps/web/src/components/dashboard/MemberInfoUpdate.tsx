'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import styles from './MemberInfoUpdate.module.css';

interface UploadResult {
  updated: number;
  unmatched: string[];
  ambiguous: string[];
  invalidBlocks: number;
}

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; message: string } | { kind: 'done'; result: UploadResult };

/** "멤버 정보 업데이트" 버튼 + 팝업 (TXT 다운로드 / 업로드). 제한 계정에서만 렌더된다 */
export function MemberInfoUpdate() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const open = () => {
    setStatus({ kind: 'idle' });
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    // 서버에서도 검사하지만, 다른 파일은 보내지 않는다
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setStatus({ kind: 'error', message: 'TXT 파일만 올릴 수 있습니다.' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setStatus({ kind: 'busy' });
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/member-accounts', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) setStatus({ kind: 'error', message: data.error ?? '업로드에 실패했습니다.' });
      else {
        setStatus({ kind: 'done', result: data });
        router.refresh();
      }
    } catch {
      setStatus({ kind: 'error', message: '업로드에 실패했습니다.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open}>
        멤버 정보 업데이트
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="member-info-title">
        <h3 id="member-info-title" className={styles.title}>
          멤버 정보 업데이트
        </h3>
        <p className={styles.desc}>
          다운로드한 TXT에 롤·스팀·배그 ID를 채워서 다시 올리면 반영됩니다. 파일에 없는 멤버는 그대로 둡니다.
        </p>

        <div className={styles.actions}>
          <a className={styles.btn} href="/api/member-accounts" download>
            멤버 목록 TXT 파일 다운로드
          </a>
          <button
            type="button"
            className={styles.btn}
            disabled={status.kind === 'busy'}
            onClick={() => fileRef.current?.click()}
          >
            {status.kind === 'busy' ? '업로드 중…' : '멤버목록 TXT 파일 업로드'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            hidden
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>

        {status.kind === 'error' && <p className={styles.error}>{status.message}</p>}
        {status.kind === 'done' && (
          <div className={styles.result}>
            <p>{status.result.updated}명 반영했습니다.</p>
            {status.result.unmatched.length > 0 && (
              <p className={styles.warn}>멤버를 찾지 못함: {status.result.unmatched.join(', ')}</p>
            )}
            {status.result.ambiguous.length > 0 && (
              <p className={styles.warn}>이름이 같은 멤버가 여럿이라 건너뜀: {status.result.ambiguous.join(', ')}</p>
            )}
            {status.result.invalidBlocks > 0 && (
              <p className={styles.warn}>이름 줄이 없어 읽지 못한 항목 {status.result.invalidBlocks}개</p>
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

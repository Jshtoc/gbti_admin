'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';

import type { MemberListItem } from '@gbti/db';

import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { searchMembers } from '@/lib/memberSearch';
import { overviewHref, type OverviewQuery } from '@/lib/overviewQuery';

import styles from './MemberPicker.module.css';

interface MemberPickerProps {
  members: MemberListItem[];
  query: OverviewQuery;
}

const MAX_RESULTS = 50;

/** 멤버 검색 + 선택 (닉네임·아이디 부분 일치, 한글 초성 검색). 선택하면 대시보드가 그 멤버 기준으로 바뀐다 */
export function MemberPicker({ members, query }: MemberPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = members.find((m) => m.userId === query.member);
  const results = useMemo(() => searchMembers(members, text).slice(0, MAX_RESULTS), [members, text]);
  // 검색어가 없을 때만 맨 위에 "전체 멤버"
  const options: (MemberListItem | null)[] = text.trim() ? results : [null, ...results];

  const close = () => {
    setOpen(false);
    setText('');
  };

  const choose = (member: MemberListItem | null) => {
    close();
    inputRef.current?.blur();
    const next = member?.userId;
    if (next === query.member) return;
    startTransition(() => router.push(overviewHref({ ...query, member: next }), { scroll: false }));
  };

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  // 키보드로 이동한 항목이 보이게 스크롤
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && options[active] !== undefined) choose(options[active]);
    } else if (e.key === 'Escape') {
      close();
      inputRef.current?.blur();
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div className={styles.root} ref={rootRef} data-selected={selected ? true : undefined}>
      <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        className={styles.input}
        role="combobox"
        aria-label="멤버 검색"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length > 0 ? optionId(active) : undefined}
        aria-busy={isPending}
        value={text}
        placeholder={open ? '이름·아이디·초성 검색' : (selected?.displayName ?? '전체 멤버')}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      <span className={styles.trailing} aria-hidden={!isPending}>
        {isPending ? (
          <Spinner size={14} label="멤버 데이터를 불러오는 중" />
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      {open && (
        <ul className={styles.list} id={listId} role="listbox" ref={listRef} aria-label="멤버 목록">
          {options.length === 0 && <li className={styles.empty}>검색 결과가 없습니다</li>}
          {options.map((m, i) => {
            const isCurrent = (m?.userId ?? undefined) === query.member;
            return (
              <li
                key={m?.userId ?? 'all'}
                id={optionId(i)}
                data-index={i}
                role="option"
                aria-selected={i === active}
                data-current={isCurrent || undefined}
                className={styles.option}
                // 입력창 포커스를 잃지 않게 mousedown에서 막고 click에서 선택
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(m)}
                onMouseEnter={() => setActive(i)}
              >
                {m ? (
                  <>
                    <Avatar name={m.displayName} src={m.avatarUrl} size="sm" />
                    <span className={styles.names}>
                      <span className={styles.name}>{m.displayName}</span>
                      <span className={styles.username}>@{m.username}</span>
                    </span>
                  </>
                ) : (
                  <span className={styles.all}>전체 멤버</span>
                )}
                {isCurrent && (
                  <svg className={styles.check} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7.5L5.8 10L11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
          {text.trim() && results.length === MAX_RESULTS && (
            <li className={styles.more}>상위 {MAX_RESULTS}명만 표시 — 검색어를 더 입력하세요</li>
          )}
        </ul>
      )}
    </div>
  );
}

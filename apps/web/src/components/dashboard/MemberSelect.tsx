'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { MemberListItem } from '@gbti/db';

import { Avatar } from '@/components/ui/Avatar';
import { searchMembers } from '@/lib/memberSearch';

import styles from './MemberPicker.module.css';

interface MemberSelectProps {
  label: string;
  members: MemberListItem[];
  value: string | undefined;
  onChange: (userId: string) => void;
}

const MAX_RESULTS = 50;

/** 멤버 한 명 고르는 검색 콤보박스 (MemberPicker와 같은 모양, 라우팅 없이 값만 올려보낸다) */
export function MemberSelect({ label, members, value, onChange }: MemberSelectProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = members.find((m) => m.userId === value);
  const results = useMemo(() => searchMembers(members, text).slice(0, MAX_RESULTS), [members, text]);

  const close = () => {
    setOpen(false);
    setText('');
  };

  const choose = (member: MemberListItem) => {
    close();
    inputRef.current?.blur();
    onChange(member.userId);
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
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      // 목록이 열려 있을 때만 선택으로 쓰고, 닫혀 있으면 폼 제출(검색)로 넘긴다
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
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
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results.length > 0 ? optionId(active) : undefined}
        value={text}
        placeholder={open ? '이름·아이디·초성 검색' : (selected?.displayName ?? label)}
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
      <span className={styles.trailing} aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {open && (
        <ul className={styles.list} id={listId} role="listbox" ref={listRef} aria-label={`${label} 목록`}>
          {results.length === 0 && <li className={styles.empty}>검색 결과가 없습니다</li>}
          {results.map((m, i) => {
            const isCurrent = m.userId === value;
            return (
              <li
                key={m.userId}
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
                <Avatar name={m.displayName} src={m.avatarUrl} size="sm" />
                <span className={styles.names}>
                  <span className={styles.name}>{m.displayName}</span>
                  <span className={styles.username}>@{m.username}</span>
                </span>
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

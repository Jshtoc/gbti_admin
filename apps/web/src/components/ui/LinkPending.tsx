'use client';

import { useLinkStatus } from 'next/link';

import { Spinner } from './Spinner';

interface LinkPendingProps {
  /** 대기 중이 아닐 때 보여줄 내용 (예: 화살표 아이콘). 없으면 아무것도 안 그림 */
  children?: React.ReactNode;
  size?: number;
}

/**
 * <Link> 안에 넣으면, 그 링크를 누르고 다음 화면을 기다리는 동안 작은 스피너로 바뀐다.
 * (서버에서 데이터를 가져오는 동안 화면이 멈춘 것처럼 보이지 않게)
 */
export function LinkPending({ children = null, size = 12 }: LinkPendingProps) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size={size} label="불러오는 중" /> : <>{children}</>;
}

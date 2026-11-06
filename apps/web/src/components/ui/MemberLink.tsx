import Link from 'next/link';
import type { ComponentProps } from 'react';

type MemberLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  href: string;
  /** false면 링크 없이 같은 모양의 박스로만 그린다 (개요 전용 계정은 멤버 상세로 갈 수 없다) */
  linked: boolean;
};

/** 멤버 상세로 가는 링크. linked=false면 클릭할 수 없는 div */
export function MemberLink({ href, linked, ...rest }: MemberLinkProps) {
  if (linked) return <Link href={href} {...rest} />;
  return <div {...(rest as ComponentProps<'div'>)} />;
}

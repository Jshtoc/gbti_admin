'use client';

import { useEffect, useRef } from 'react';

import styles from './Reveal.module.css';

interface RevealProps {
  children: React.ReactNode;
  /** 순차 등장 순서 (40ms 간격, 최대 300ms) */
  index?: number;
  className?: string;
}

/** 스크롤 진입 시 fade + slide-up. prefers-reduced-motion이면 즉시 표시(CSS). */
export function Reveal({ children, index = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.inView = 'true';
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `${styles.reveal} ${className}` : styles.reveal}
      style={{ transitionDelay: `${Math.min(index * 40, 300)}ms` }}
    >
      {children}
    </div>
  );
}

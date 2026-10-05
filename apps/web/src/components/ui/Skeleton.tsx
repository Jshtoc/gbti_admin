import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}

/** 내용이 들어올 자리를 미리 보여주는 회색 블록 (빛이 지나가는 효과) */
export function Skeleton({ width = '100%', height = 14, radius = 8, className }: SkeletonProps) {
  return (
    <span
      className={className ? `${styles.block} ${className}` : styles.block}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

interface SkeletonPanelProps {
  children: React.ReactNode;
  className?: string;
}

/** 대시보드 패널 모양 틀 */
export function SkeletonPanel({ children, className }: SkeletonPanelProps) {
  return <div className={className ? `${styles.panel} ${className}` : styles.panel}>{children}</div>;
}

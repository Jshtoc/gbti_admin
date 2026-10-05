import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: number;
  /** 스크린리더용 문구. 장식용이면 생략 */
  label?: string;
}

/** 작은 원형 로딩 표시 (accent 색) */
export function Spinner({ size = 14, label }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

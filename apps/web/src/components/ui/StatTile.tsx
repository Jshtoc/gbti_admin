import styles from './StatTile.module.css';

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  caption?: React.ReactNode;
  /** 화면의 대표 지표 하나에만 accent를 준다 */
  highlight?: boolean;
}

export function StatTile({ label, value, unit, caption, highlight = false }: StatTileProps) {
  return (
    <div className={styles.tile} data-highlight={highlight || undefined}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>
        <span className="tabular">{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </p>
      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}

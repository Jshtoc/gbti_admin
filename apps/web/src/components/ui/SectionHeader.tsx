import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  id?: string;
  aside?: React.ReactNode;
}

export function SectionHeader({ eyebrow, title, id, aside }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title} id={id}>
          {title}
        </h2>
      </div>
      {aside && <div className={styles.aside}>{aside}</div>}
    </div>
  );
}

import styles from './PageHero.module.css';

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  /** 우측(모바일에선 하단)에 놓일 컨트롤 */
  aside?: React.ReactNode;
}

export function PageHero({ eyebrow, title, description, aside }: PageHeroProps) {
  return (
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.desc}>{description}</p>}
      </div>
      {aside && <div className={styles.aside}>{aside}</div>}
    </section>
  );
}

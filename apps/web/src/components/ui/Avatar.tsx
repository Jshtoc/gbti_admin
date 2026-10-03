import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  src: string | null;
  size?: 'sm' | 'md' | 'lg';
}

/** 디스코드 아바타. 없으면 이름 첫 글자. */
export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  return (
    <span className={styles.avatar} data-size={size} aria-hidden="true">
      {src ? (
        // 디스코드 CDN 이미지는 next/image 원격 도메인 설정 전까지 img로 둔다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={styles.img} />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}

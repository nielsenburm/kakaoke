import { useState } from 'react';
import styles from './CoverImage.module.css';

const PLACEHOLDER = '/album-placeholder.png';

interface CoverImageProps {
  url: string | null;
  alt: string;
  size?: number;
}

export function CoverImage({ url, alt, size }: CoverImageProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = url && url !== failed ? url : PLACEHOLDER;

  return (
    <div
      className={styles.cover}
      style={size ? { width: size, height: size } : undefined}
    >
      <img
        src={src}
        alt={alt}
        className={styles.img}
        onError={() => { if (url) setFailed(url); }}
      />
    </div>
  );
}

import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  lines?: number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '1em',
  borderRadius = '4px',
  lines,
  className,
}: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={`${styles.lines} ${className ?? ''}`}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`${styles.line} ${i === lines - 1 ? styles.lineLast : ''}`}
            style={{ height, borderRadius }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius }}
    />
  );
}

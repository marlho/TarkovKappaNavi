import styles from './Badge.module.css';

type BadgeVariant = 'done' | 'inProgress' | 'locked' | 'kappa' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
}

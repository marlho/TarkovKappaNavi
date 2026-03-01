import { useT } from '../../i18n';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  const t = useT();
  return <div className={`${styles.spinner} ${styles[size]}`} aria-label={t.spinner_loading} />;
}

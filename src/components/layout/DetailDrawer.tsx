import styles from './DetailDrawer.module.css';

interface DetailDrawerProps {
  open: boolean;
  children?: React.ReactNode;
}

export function DetailDrawer({ open, children }: DetailDrawerProps) {
  if (!open) return null;
  return (
    <aside className={styles.drawer}>
      {children ?? <div className={styles.placeholder}>タスクを選択して詳細を表示</div>}
    </aside>
  );
}

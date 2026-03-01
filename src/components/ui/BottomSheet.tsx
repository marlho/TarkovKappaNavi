import { useEffect, useCallback, useRef, useState } from 'react';
import { useT } from '../../i18n';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const t = useT();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  // 閉じたら展開状態をリセット
  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    // 下方向はそのまま追従、上方向はダンピング
    const translate = deltaY > 0 ? deltaY : deltaY * 0.3;
    sheetRef.current.style.transform = `translateY(${translate}px)`;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    isDragging.current = false;

    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - touchStartY.current;
    const sheetHeight = sheetRef.current.offsetHeight;
    // シート高さの30%以上スワイプしたら閉じる（最低100px）
    const closeThreshold = Math.max(sheetHeight * 0.3, 100);

    if (deltaY > closeThreshold) {
      // 閉じるアニメーション: 画面外に押し出す
      sheetRef.current.style.transition = 'transform 0.25s ease-out';
      sheetRef.current.style.transform = `translateY(${sheetHeight}px)`;
      setTimeout(onClose, 250);
    } else if (deltaY < -50) {
      // 上スワイプ: 展開
      sheetRef.current.style.transition = 'transform 0.25s ease-out';
      sheetRef.current.style.transform = '';
      setExpanded(true);
    } else {
      // 閾値未満: 元の位置にスナップバック
      sheetRef.current.style.transition = 'transform 0.25s ease-out';
      sheetRef.current.style.transform = '';
    }
  }, [onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${expanded ? styles.expanded : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.handleArea}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.handle} />
          <div className={styles.header}>
            {title && <span className={styles.title}>{title}</span>}
            <button className={styles.closeBtn} onClick={onClose} aria-label={t.modal_close}>
              &times;
            </button>
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}

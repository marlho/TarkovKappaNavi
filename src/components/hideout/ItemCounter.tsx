import { useRef, useEffect } from 'react';
import { setHideoutLevelItemCount } from '../../db/operations';
import styles from './ItemCounter.module.css';

interface ItemCounterProps {
  levelId: string;
  itemId: string;
  itemName: string;
  iconLink: string | null;
  count: number;       // 必要数
  ownedCount: number;  // 所持数
}

export function ItemCounter({ levelId, itemId, itemName, iconLink, count, ownedCount }: ItemCounterProps) {
  const fulfilled = ownedCount >= count;
  const nameRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const check = () => {
      const isOver = el.scrollWidth > el.clientWidth + 1;
      el.classList.toggle(styles.overflowing, isOver);
      if (isOver) {
        const offset = el.clientWidth - el.scrollWidth;
        el.style.setProperty('--marquee-offset', `${offset}px`);
        el.style.setProperty('--marquee-dur', `${Math.max(4, Math.abs(offset) / 20)}s`);
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [itemName]);

  const step = count % 1000 === 0 ? 1000 : count % 100 === 0 ? 100 : 1;

  const handleDecrement = () => {
    setHideoutLevelItemCount(levelId, itemId, Math.max(0, ownedCount - step));
  };

  const handleIncrement = () => {
    setHideoutLevelItemCount(levelId, itemId, ownedCount + step);
  };

  const handleClear = () => {
    setHideoutLevelItemCount(levelId, itemId, 0);
  };

  const handleFill = () => {
    setHideoutLevelItemCount(levelId, itemId, count);
  };

  return (
    <div className={`${styles.row} ${fulfilled ? styles.fulfilled : ''}`}>
      {iconLink && <img src={iconLink} alt="" className={styles.icon} />}
      <span className={styles.itemName} ref={nameRef} title={itemName}>
        <span className={styles.itemNameInner}>{itemName}</span>
      </span>
      <span className={styles.need}>&times;{count}</span>
      <div className={styles.controls}>
        <button
          className={styles.btn}
          onClick={handleDecrement}
          disabled={ownedCount <= 0}
        >
          &minus;
        </button>
        <span className={styles.owned}>{ownedCount}</span>
        <button className={styles.btn} onClick={handleIncrement}>
          +
        </button>
        <div className={styles.stackBtns}>
          <button
            className={`${styles.stackBtn} ${styles.fillBtn}`}
            onClick={handleFill}
            disabled={fulfilled}
            title={`${count}にセット`}
          >
            MAX
          </button>
          <button
            className={`${styles.stackBtn} ${styles.clearBtn}`}
            onClick={handleClear}
            disabled={ownedCount <= 0}
            title="0にセット"
          >
            MIN
          </button>
        </div>
      </div>
    </div>
  );
}

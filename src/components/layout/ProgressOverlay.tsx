import { useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n';
import { ProgressBar } from '../ui/ProgressBar';
import styles from './ProgressOverlay.module.css';

type LoadingStage = 'db' | 'api' | 'progress';

interface ProgressOverlayProps {
  stage: LoadingStage;
  visible: boolean;
  onComplete: () => void;
}

export function ProgressOverlay({ stage, visible, onComplete }: ProgressOverlayProps) {
  const t = useT();
  const [displayPct, setDisplayPct] = useState(0);
  const completedRef = useRef(false);

  const stageLabels: Record<LoadingStage, string> = {
    db: t.loading_db,
    api: t.loading_api,
    progress: t.loading_progress,
  };

  // ステージに応じた進捗演出
  useEffect(() => {
    if (stage === 'db') {
      setDisplayPct(10);
      return;
    }

    if (stage === 'api') {
      // apiステージ: 10→75% の指数減衰カーブ
      setDisplayPct(10);
      const start = Date.now();
      const id = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        const pct = 10 + 65 * (1 - Math.exp(-0.3 * elapsed));
        setDisplayPct(Math.min(75, pct));
      }, 200);
      return () => clearInterval(id);
    }

    if (stage === 'progress') {
      setDisplayPct(80);
    }
  }, [stage]);

  // 80%到達でonCompleteを発火（1回のみ）
  useEffect(() => {
    if (displayPct >= 80 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [displayPct, onComplete]);

  return (
    <div
      className={styles.overlay}
      data-hidden={!visible || undefined}
      onTransitionEnd={() => {
        // フェードアウト完了後、親にDOM除去を任せる（visibleがfalseなら自然に除去される）
      }}
    >
      <div className={styles.title}>Tarkov Kappa Navi</div>
      <div className={styles.barWrap}>
        <ProgressBar value={displayPct} />
      </div>
      <div className={styles.label}>{stageLabels[stage]}</div>
    </div>
  );
}

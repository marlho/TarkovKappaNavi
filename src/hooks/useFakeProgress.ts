import { useState, useEffect } from 'react';

/**
 * ローディング中にマウントされている間、5%→90%を指数減衰で増加させる。
 * コンポーネントのアンマウント（ロード完了）で自動的に停止する。
 */
export function useFakeProgress(): number {
  const [pct, setPct] = useState(5);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const next = 5 + 85 * (1 - Math.exp(-0.35 * elapsed));
      setPct(Math.min(90, next));
    }, 200);
    return () => clearInterval(id);
  }, []);

  return Math.round(pct);
}

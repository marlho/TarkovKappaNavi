import { Minus, Plus } from 'lucide-react';
import styles from './LevelInput.module.css';

interface LevelInputProps {
  value: number;
  onChange: (level: number) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function LevelInput({ value, onChange }: LevelInputProps) {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10);
    if (!isNaN(n)) onChange(clamp(n, 1, 79));
  };

  return (
    <div className={styles.wrapper}>
      <button className={styles.btn} onClick={() => onChange(clamp(value - 1, 1, 79))}><Minus size={14} /></button>
      <input
        className={styles.input}
        type="number"
        min={1}
        max={79}
        value={value}
        onChange={handleInput}
      />
      <button className={styles.btn} onClick={() => onChange(clamp(value + 1, 1, 79))}><Plus size={14} /></button>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import styles from './MultiSelect.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: SelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const hasSelection = selected.length > 0;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.trigger}${hasSelection ? ` ${styles.triggerActive}` : ''}`}
        onClick={() => setOpen(!open)}
      >
        {label}
        {hasSelection && <span className={styles.count}>{selected.length}</span>}
      </button>
      {open && (
        <div className={styles.dropdown}>
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <div key={opt.value} className={styles.option} onClick={() => toggle(opt.value)}>
                <span className={`${styles.checkbox}${isChecked ? ` ${styles.checked}` : ''}`}>
                  {isChecked ? <Check size={12} /> : ''}
                </span>
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

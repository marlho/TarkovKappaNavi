import { useState, useRef, useCallback } from 'react';
import type { MapPinRow, PinColor, PinShape } from '../../db/types';
import { useT } from '../../i18n';
import styles from './PinEditPopover.module.css';

interface PinEditPopoverProps {
  pin?: MapPinRow;
  position: { x: number; y: number };
  onSave: (label: string, color: PinColor, shape: PinShape) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const COLOR_OPTIONS: PinColor[] = ['red', 'blue', 'yellow', 'green', 'purple', 'white'];

const COLOR_HEX: Record<PinColor, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  yellow: '#f1c40f',
  green: '#2ecc71',
  purple: '#9b59b6',
  white: '#ecf0f1',
};

const SHAPE_OPTIONS: PinShape[] = ['circle', 'diamond', 'square', 'triangle', 'star', 'marker'];

const SHAPE_PREVIEW_CLASS: Record<PinShape, string> = {
  circle: styles.previewCircle,
  diamond: styles.previewDiamond,
  square: styles.previewSquare,
  triangle: styles.previewTriangle,
  star: styles.previewStar,
  marker: styles.previewMarker,
};

const BUILTIN_PRESETS = ['キル', '行くだけ', '回収', '設置', '発見', '脱出'];

const PRESETS_KEY = 'tarkov-kappa-pin-label-presets';

function loadPresets(): string[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [...BUILTIN_PRESETS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [...BUILTIN_PRESETS];
  } catch {
    return [...BUILTIN_PRESETS];
  }
}

function savePresets(presets: string[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

/** 既存ラベル文字列をタグ配列に分解 */
function parseLabels(label: string): string[] {
  if (!label.trim()) return [];
  return label.split('/').map((s) => s.trim()).filter(Boolean);
}

export function PinEditPopover({ pin, position, onSave, onDelete, onCancel }: PinEditPopoverProps) {
  const t = useT();
  const [tags, setTags] = useState<string[]>(() => parseLabels(pin?.label ?? ''));
  const [input, setInput] = useState('');
  const [color, setColor] = useState<PinColor>(pin?.color ?? 'red');
  const [shape, setShape] = useState<PinShape>(pin?.shape ?? 'circle');
  const [presets, setPresets] = useState<string[]>(loadPresets);
  const inputRef = useRef<HTMLInputElement>(null);

  const registerPreset = useCallback((text: string) => {
    if (!text) return;
    setPresets((prev) => {
      if (prev.includes(text)) return prev;
      const next = [...prev, text];
      savePresets(next);
      return next;
    });
  }, []);

  const removePreset = useCallback((text: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p !== text);
      savePresets(next);
      return next;
    });
  }, []);

  const addTag = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTags((prev) => [...prev, trimmed]);
    registerPreset(trimmed);
  }, [registerPreset]);

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
        setInput('');
      } else {
        onSave(tags.join(' / '), color, shape);
      }
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handlePresetClick = (presetLabel: string) => {
    addTag(presetLabel);
    inputRef.current?.focus();
  };

  const handleSave = () => {
    const finalTags = input.trim() ? [...tags, input.trim()] : tags;
    if (input.trim()) registerPreset(input.trim());
    onSave(finalTags.join(' / '), color, shape);
  };

  return (
    <div
      className={styles.popover}
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={styles.tagInputWrap}>
        {tags.map((tag, i) => (
          <span key={i} className={styles.tag}>
            <span className={styles.tagText}>{tag}</span>
            <button
              type="button"
              className={styles.tagDelete}
              onClick={() => removeTag(i)}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className={styles.tagInput}
          type="text"
          maxLength={100}
          placeholder={tags.length === 0 ? t.map_pin_label_placeholder : ''}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          autoFocus
        />
      </div>

      <div className={styles.presetChips}>
        {presets.map((label) => (
          <span key={label} className={styles.presetChipWrap}>
            <button
              className={styles.presetChip}
              type="button"
              onClick={() => handlePresetClick(label)}
            >
              {label}
            </button>
            <button
              type="button"
              className={styles.presetChipDelete}
              onClick={(e) => { e.stopPropagation(); removePreset(label); }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div className={styles.palette}>
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            className={`${styles.colorBtn} ${color === c ? styles.colorBtnActive : ''}`}
            style={{ background: COLOR_HEX[c] }}
            onClick={() => setColor(c)}
            title={c}
          />
        ))}
      </div>

      <div className={styles.shapePalette}>
        <span className={styles.shapeLabel}>{t.map_pin_shape}</span>
        <div className={styles.shapeRow}>
          {SHAPE_OPTIONS.map((s) => (
            <button
              key={s}
              className={`${styles.shapeBtn} ${shape === s ? styles.shapeBtnActive : ''}`}
              onClick={() => setShape(s)}
              title={t[`map_pin_shape_${s}` as keyof typeof t] ?? s}
            >
              <span
                className={styles.shapePreview}
                style={{ ['--preview-color' as string]: COLOR_HEX[color] }}
              >
                <span className={SHAPE_PREVIEW_CLASS[s]} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={handleSave}>
          {pin ? t.map_pin_edit : t.map_pin_add}
        </button>
        {pin && onDelete && (
          <button className={styles.deleteBtn} onClick={onDelete}>
            {t.map_pin_delete}
          </button>
        )}
        <button className={styles.cancelBtn} onClick={onCancel}>
          {t.common_cancel}
        </button>
      </div>
    </div>
  );
}

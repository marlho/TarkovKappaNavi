import { useState } from 'react';
import { Settings, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { MapPinRow, PinShape } from '../../db/types';
import { useT } from '../../i18n';
import { PinPresetList } from './PinPresetList';
import styles from './PinListPanel.module.css';

interface PinListPanelProps {
  pins: MapPinRow[];
  onAddClick: () => void;
  onPinClick: (pin: MapPinRow) => void;
  onPinEdit: (pin: MapPinRow) => void;
  onPinDelete: (pin: MapPinRow) => void;
  pinOpacity: number;
  onPinOpacityChange: (value: number) => void;
  pinSize: number;
  onPinSizeChange: (value: number) => void;
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
}

const PIN_COLORS: Record<string, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  yellow: '#f1c40f',
  green: '#2ecc71',
  purple: '#9b59b6',
  white: '#ecf0f1',
};

const SHAPE_DOT_CLASS: Record<PinShape, string> = {
  circle: styles.dotCircle,
  diamond: styles.dotDiamond,
  square: styles.dotSquare,
  triangle: styles.dotTriangle,
  star: styles.dotStar,
  marker: styles.dotMarker,
};

export function PinListPanel({ pins, onAddClick, onPinClick, onPinEdit, onPinDelete, pinOpacity, onPinOpacityChange, pinSize, onPinSizeChange, showLabels, onShowLabelsChange }: PinListPanelProps) {
  const t = useT();
  const [pinsCollapsed, setPinsCollapsed] = useState(() => {
    return localStorage.getItem('tarkov-kappa-pins-collapsed') === 'true';
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t.map_pin_count.replace('{count}', String(pins.length))}</span>
        <button className={styles.addBtn} onClick={onAddClick}>{t.map_pin_add}</button>
      </div>

      <div className={styles.sliderGroup}>
        <label className={styles.sliderLabel}>
          {t.map_pin_opacity}
          <span className={styles.sliderValue}>{Math.round(pinOpacity * 100)}%</span>
        </label>
        <input
          type="range"
          className={styles.slider}
          min={0} max={100} step={5}
          value={Math.round(pinOpacity * 100)}
          onChange={(e) => onPinOpacityChange(Number(e.target.value) / 100)}
        />
      </div>
      <div className={styles.sliderGroup}>
        <label className={styles.sliderLabel}>
          {t.map_pin_size}
          <span className={styles.sliderValue}>{pinSize}px</span>
        </label>
        <input
          type="range"
          className={styles.slider}
          min={8} max={32} step={2}
          value={pinSize}
          onChange={(e) => onPinSizeChange(Number(e.target.value))}
        />
      </div>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={showLabels}
          onChange={(e) => onShowLabelsChange(e.target.checked)}
        />
        {t.map_pin_show_labels}
      </label>

      <button
        className={styles.sectionToggle}
        onClick={() => setPinsCollapsed((v) => { const next = !v; localStorage.setItem('tarkov-kappa-pins-collapsed', String(next)); return next; })}
      >
        {pinsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <span className={styles.sectionTitle}>{t.map_pin_section_user}</span>
        <span className={styles.sectionCount}>{pins.length}</span>
      </button>

      {!pinsCollapsed && (
        pins.length === 0 ? (
          <div className={styles.empty}>{t.map_pin_empty}</div>
        ) : (
          <div className={styles.list}>
            {pins.map((pin) => {
              const shape: PinShape = pin.shape ?? 'circle';
              return (
                <div
                  key={pin.id}
                  className={styles.row}
                  onClick={() => onPinClick(pin)}
                >
                  <span
                    className={`${styles.colorDot} ${SHAPE_DOT_CLASS[shape] ?? ''}`}
                    style={{ ['--dot-color' as string]: PIN_COLORS[pin.color] ?? PIN_COLORS.white }}
                  />
                  <span className={styles.pinLabel}>{pin.label || '(no label)'}</span>
                  <button
                    className={styles.iconBtn}
                    title={t.map_pin_edit}
                    onClick={(e) => { e.stopPropagation(); onPinEdit(pin); }}
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    className={styles.iconBtn}
                    title={t.map_pin_delete}
                    onClick={(e) => { e.stopPropagation(); onPinDelete(pin); }}
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      <PinPresetList pins={pins} />
    </div>
  );
}

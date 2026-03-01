import type { MapModel } from '../../api/types';
import styles from './MapSelector.module.css';

interface MapSelectorProps {
  maps: MapModel[];
  selectedMapId: string | null;
  onSelect: (mapId: string) => void;
}

export function MapSelector({ maps, selectedMapId, onSelect }: MapSelectorProps) {
  return (
    <select
      className={styles.select}
      value={selectedMapId ?? ''}
      onChange={(e) => e.target.value && onSelect(e.target.value)}
    >
      <option value="">マップを選択</option>
      {maps.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

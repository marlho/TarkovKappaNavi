import { useMemo } from 'react';
import { useTraders, useMaps } from '../../api/hooks';
import { useFilterStore } from '../../stores/filterStore';
import { useT } from '../../i18n';
import { MultiSelect, type SelectOption } from '../ui/MultiSelect';
import type { TaskStatus } from '../../db/types';
import styles from './TaskFilterBar.module.css';

export function TaskFilterBar() {
  const t = useT();

  const statusOptions: SelectOption[] = useMemo(() => [
    { value: 'not_started', label: t.status_not_started },
    { value: 'in_progress', label: t.status_in_progress },
    { value: 'done', label: t.status_done },
  ], [t]);

  const typeOptions: SelectOption[] = useMemo(() => [
    { value: 'shoot', label: t.type_shoot },
    { value: 'giveItem', label: t.type_giveItem },
    { value: 'visit', label: t.type_visit },
    { value: 'findItem', label: t.type_findItem },
    { value: 'plantItem', label: t.type_plantItem },
    { value: 'mark', label: t.type_mark },
    { value: 'extract', label: t.type_extract },
    { value: 'skill', label: t.type_skill },
    { value: 'traderLevel', label: t.type_traderLevel },
    { value: 'experience', label: t.type_experience },
  ], [t]);
  const { data: traders } = useTraders();
  const { data: maps } = useMaps();

  const {
    traders: selTraders,
    maps: selMaps,
    types: selTypes,
    statuses: selStatuses,
    search,
    kappaOnly,
    setTraders,
    setMaps,
    setTypes,
    setStatuses,
    setSearch,
    setKappaOnly,
    resetFilters,
  } = useFilterStore();

  const traderOptions: SelectOption[] = (traders ?? []).map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const mapOptions: SelectOption[] = (maps ?? []).map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const hasFilters =
    selTraders.length > 0 ||
    selMaps.length > 0 ||
    selTypes.length > 0 ||
    selStatuses.length > 0 ||
    search !== '' ||
    kappaOnly;

  return (
    <div className={styles.bar}>
      <input
        type="text"
        className={styles.search}
        placeholder={t.filter_search_placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={styles.filters}>
        <MultiSelect label={t.filter_trader} options={traderOptions} selected={selTraders} onChange={setTraders} />
        <MultiSelect label={t.filter_map} options={mapOptions} selected={selMaps} onChange={setMaps} />
        <MultiSelect label={t.filter_type} options={typeOptions} selected={selTypes} onChange={setTypes} />
        <MultiSelect
          label={t.filter_status}
          options={statusOptions}
          selected={selStatuses}
          onChange={(v) => setStatuses(v as TaskStatus[])}
        />
        <button
          type="button"
          className={`${styles.toggle}${kappaOnly ? ` ${styles.toggleActive}` : ''}`}
          onClick={() => setKappaOnly(!kappaOnly)}
        >
          Kappa
        </button>
        {hasFilters && (
          <>
            <div className={styles.spacer} />
            <button type="button" className={styles.resetBtn} onClick={resetFilters}>
              {t.filter_reset}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

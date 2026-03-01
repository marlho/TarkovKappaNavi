import { useState, useEffect, useRef, useMemo } from 'react';
import { useItemFilterStore, type TaskRelation } from '../../stores/itemFilterStore';
import { TIER_ORDER, buildTierConfig } from '../../domain/itemTier';
import { useTierThresholds } from '../../stores/tierStore';
import { MultiSelect, type SelectOption } from '../ui/MultiSelect';
import { useT } from '../../i18n';
import type { Dictionary } from '../../i18n';
import type { PriceTier } from '../../api/types';
import styles from './ItemFilterBar.module.css';

interface ItemFilterBarProps {
  availableTypes: string[];
}

function toggleValue(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function ItemFilterBar({ availableTypes }: ItemFilterBarProps) {
  const t = useT();
  const thresholds = useTierThresholds();
  const tierConfig = useMemo(() => buildTierConfig(thresholds), [thresholds]);
  const tierOptions: SelectOption[] = useMemo(() =>
    TIER_ORDER.map((tier) => ({
      value: tier,
      label: `${tierConfig[tier].label} (${tierConfig[tier].description})`,
    })),
  [tierConfig]);

  const {
    search, types, tiers, taskRelations, sortBy, sortDir, viewMode,
    setSearch, setTypes, setTiers, setTaskRelations, setSortBy, toggleSortDir, setViewMode, resetFilters,
  } = useItemFilterStore();

  const sortOptions: { value: string; label: string }[] = [
    { value: 'pricePerSlot', label: t.items_sort_pricePerSlot },
    { value: 'bestSellPrice', label: t.items_sort_bestSellPrice },
    { value: 'name', label: t.items_sort_name },
  ];

  const taskRelationOptions: { value: TaskRelation; label: string }[] = [
    { value: 'usedInKappaTask', label: t.items_task_usedInKappa },
    { value: 'rewardFromTask', label: t.items_task_rewardFromTask },
    { value: 'collector', label: t.items_task_collector },
  ];

  const getTypeLabel = (typeKey: string): string => {
    const dictKey = `item_type_${typeKey}` as keyof Dictionary;
    return (t[dictKey] as string) ?? typeKey;
  };

  // デバウンス付き検索: ローカルstateで即時反映、ストアは300ms遅延
  const [localSearch, setLocalSearch] = useState(search);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearch(value), 300);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const hasFilters = localSearch !== '' || types.length > 0 || tiers.length > 0 || taskRelations.length > 0;

  return (
    <div className={styles.bar}>
      <div className={styles.topRow}>
        <input
          type="text"
          className={styles.search}
          placeholder={t.items_search_placeholder}
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <MultiSelect
          label={t.items_view_tier}
          options={tierOptions}
          selected={tiers}
          onChange={(v) => setTiers(v as PriceTier[])}
        />

        <div className={styles.taskRelationGroup}>
          {taskRelationOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.taskRelationBtn}${taskRelations.includes(opt.value) ? ` ${styles.taskRelationBtnActive}` : ''}`}
              onClick={() => setTaskRelations(toggleValue(taskRelations, opt.value) as TaskRelation[])}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.sortGroup}>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'pricePerSlot' | 'bestSellPrice' | 'name')}
            disabled={viewMode === 'tier'}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="button" className={styles.sortDirBtn} onClick={toggleSortDir} disabled={viewMode === 'tier'}>
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        <div className={styles.viewToggle}>
          <button
            type="button"
            className={`${styles.viewBtn}${viewMode === 'tier' ? ` ${styles.viewBtnActive}` : ''}`}
            onClick={() => setViewMode('tier')}
          >
            {t.items_view_tier}
          </button>
          <button
            type="button"
            className={`${styles.viewBtn}${viewMode === 'grid' ? ` ${styles.viewBtnActive}` : ''}`}
            onClick={() => setViewMode('grid')}
          >
            {t.items_view_grid}
          </button>
        </div>

        {hasFilters && (
          <>
            <div className={styles.spacer} />
            <button type="button" className={styles.resetBtn} onClick={resetFilters}>
              {t.items_reset}
            </button>
          </>
        )}
      </div>

      <div className={styles.typeRow}>
        {availableTypes.map((typ) => (
          <button
            key={typ}
            type="button"
            className={`${styles.typeBtn}${types.includes(typ) ? ` ${styles.typeBtnActive}` : ''}`}
            onClick={() => setTypes(toggleValue(types, typ))}
          >
            {getTypeLabel(typ)}
          </button>
        ))}
      </div>
    </div>
  );
}

import type { ItemModel, PriceTier } from '../api/types';
import type { TaskRelation } from '../stores/itemFilterStore';
import type { TierThresholds } from '../stores/tierStore';

export const TIER_ORDER: PriceTier[] = ['S', 'A', 'B', 'C', 'D'];

export interface TierConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const TIER_STYLE: Record<PriceTier, { label: string; color: string; bgColor: string }> = {
  S: { label: 'S', color: '#ffd700', bgColor: 'rgba(255, 215, 0, 0.12)' },
  A: { label: 'A', color: '#e74c3c', bgColor: 'rgba(231, 76, 60, 0.12)' },
  B: { label: 'B', color: '#b5a55a', bgColor: 'rgba(181, 165, 90, 0.12)' },
  C: { label: 'C', color: '#9e9a93', bgColor: 'rgba(158, 154, 147, 0.12)' },
  D: { label: 'D', color: '#6b6660', bgColor: 'rgba(107, 102, 96, 0.12)' },
};

function formatNum(n: number): string {
  return n.toLocaleString();
}

/** カスタム閾値に基づいたTIER_CONFIGを生成する */
export function buildTierConfig(thresholds: TierThresholds): Record<PriceTier, TierConfig> {
  return {
    S: { ...TIER_STYLE.S, description: `₽${formatNum(thresholds.S)}+/slot` },
    A: { ...TIER_STYLE.A, description: `₽${formatNum(thresholds.A)}–${formatNum(thresholds.S - 1)}/slot` },
    B: { ...TIER_STYLE.B, description: `₽${formatNum(thresholds.B)}–${formatNum(thresholds.A - 1)}/slot` },
    C: { ...TIER_STYLE.C, description: `₽${formatNum(thresholds.C)}–${formatNum(thresholds.B - 1)}/slot` },
    D: { ...TIER_STYLE.D, description: `₽${formatNum(thresholds.C)}未満/slot` },
  };
}

/** デフォルト閾値のTIER_CONFIG（後方互換） */
export const TIER_CONFIG: Record<PriceTier, TierConfig> = {
  S: { ...TIER_STYLE.S, description: '₽100,000+/slot' },
  A: { ...TIER_STYLE.A, description: '₽50,000–99,999/slot' },
  B: { ...TIER_STYLE.B, description: '₽20,000–49,999/slot' },
  C: { ...TIER_STYLE.C, description: '₽10,000–19,999/slot' },
  D: { ...TIER_STYLE.D, description: '₽10,000未満/slot' },
};

export interface ItemFilters {
  search: string;
  types: string[];
  tiers: PriceTier[];
  taskRelations: TaskRelation[];
  kappaTaskIds?: Set<string>;
  collectorTaskId?: string | null;
  sortBy: 'pricePerSlot' | 'bestSellPrice' | 'name';
  sortDir: 'asc' | 'desc';
}

export function filterItems(items: ItemModel[], filters: ItemFilters): ItemModel[] {
  let result = items;

  // テキスト検索
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.shortName.toLowerCase().includes(q) ||
        item.shortNameEn.toLowerCase().includes(q),
    );
  }

  // タイプフィルタ
  if (filters.types.length > 0) {
    const typeSet = new Set(filters.types);
    result = result.filter((item) => item.types.some((t) => typeSet.has(t)));
  }

  // ティアフィルタ
  if (filters.tiers.length > 0) {
    const tierSet = new Set(filters.tiers);
    result = result.filter((item) => tierSet.has(item.tier));
  }

  // タスク関連フィルタ（OR条件: いずれかに該当すればOK）
  if (filters.taskRelations.length > 0) {
    const cId = filters.collectorTaskId;
    const kappaIds = filters.kappaTaskIds;
    result = result.filter((item) =>
      filters.taskRelations.some((rel) => {
        if (rel === 'usedInKappaTask') return kappaIds ? item.usedInTaskIds.some((id) => kappaIds.has(id)) : false;
        if (rel === 'rewardFromTask') return item.hasTaskReward;
        if (rel === 'collector') return cId ? item.usedInTaskIds.includes(cId) : false;
        return false;
      }),
    );
  }

  // ソート
  const dir = filters.sortDir === 'asc' ? 1 : -1;
  result = [...result].sort((a, b) => {
    if (filters.sortBy === 'name') {
      return a.name.localeCompare(b.name) * dir;
    }
    return (a[filters.sortBy] - b[filters.sortBy]) * dir;
  });

  return result;
}

export function groupByTier(items: ItemModel[]): Map<PriceTier, ItemModel[]> {
  const map = new Map<PriceTier, ItemModel[]>();
  for (const tier of TIER_ORDER) {
    map.set(tier, []);
  }
  for (const item of items) {
    map.get(item.tier)!.push(item);
  }
  // 各ティア内を pricePerSlot 降順ソート
  for (const [, list] of map) {
    list.sort((a, b) => b.pricePerSlot - a.pricePerSlot);
  }
  return map;
}

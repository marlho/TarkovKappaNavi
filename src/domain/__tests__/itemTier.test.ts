import { describe, it, expect } from 'vitest';
import { calcTier } from '../../api/normalize';
import { filterItems, groupByTier, TIER_ORDER } from '../itemTier';
import type { ItemModel, PriceTier } from '../../api/types';

function makeItem(overrides: Partial<ItemModel> = {}): ItemModel {
  return {
    id: 'item1',
    name: 'テストアイテム',
    nameEn: 'Test Item',
    shortName: 'テスト',
    shortNameEn: 'Test',
    iconLink: null,
    types: ['gun'],
    slots: 1,
    basePrice: 10000,
    fleaPrice: 50000,
    bestSellPrice: 50000,
    bestSellSource: 'fleaMarket',
    pricePerSlot: 50000,
    tier: 'A',
    hasTaskUsage: false,
    hasTaskReward: false,
    usedInTaskIds: [],
    ...overrides,
  };
}

describe('calcTier', () => {
  it('S: ₽100,000以上', () => {
    expect(calcTier(100_000)).toBe('S');
    expect(calcTier(200_000)).toBe('S');
  });

  it('A: ₽50,000–99,999', () => {
    expect(calcTier(50_000)).toBe('A');
    expect(calcTier(99_999)).toBe('A');
  });

  it('B: ₽20,000–49,999', () => {
    expect(calcTier(20_000)).toBe('B');
    expect(calcTier(49_999)).toBe('B');
  });

  it('C: ₽10,000–19,999', () => {
    expect(calcTier(10_000)).toBe('C');
    expect(calcTier(19_999)).toBe('C');
  });

  it('D: ₽10,000未満', () => {
    expect(calcTier(9_999)).toBe('D');
    expect(calcTier(0)).toBe('D');
  });
});

describe('filterItems', () => {
  const items = [
    makeItem({ id: '1', name: 'AK-74N', shortName: 'AK-74N', types: ['gun'], tier: 'B', pricePerSlot: 30000, bestSellPrice: 120000 }),
    makeItem({ id: '2', name: 'Salewa', shortName: 'Salewa', types: ['meds'], tier: 'C', pricePerSlot: 15000, bestSellPrice: 15000 }),
    makeItem({ id: '3', name: 'GPU', shortName: 'GPU', types: ['barter'], tier: 'S', pricePerSlot: 150000, bestSellPrice: 150000 }),
  ];

  const defaultFilters = { search: '', types: [], tiers: [] as PriceTier[], taskRelations: [] as import('../../stores/itemFilterStore').TaskRelation[], sortBy: 'pricePerSlot' as const, sortDir: 'desc' as const };

  it('テキスト検索', () => {
    const result = filterItems(items, { ...defaultFilters, search: 'ak' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('タイプフィルタ', () => {
    const result = filterItems(items, { ...defaultFilters, types: ['meds'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('ティアフィルタ', () => {
    const result = filterItems(items, { ...defaultFilters, tiers: ['S', 'B'] });
    expect(result).toHaveLength(2);
  });

  it('pricePerSlot降順ソート', () => {
    const result = filterItems(items, defaultFilters);
    expect(result.map((i) => i.id)).toEqual(['3', '1', '2']);
  });

  it('name昇順ソート', () => {
    const result = filterItems(items, { ...defaultFilters, sortBy: 'name', sortDir: 'asc' });
    expect(result.map((i) => i.id)).toEqual(['1', '3', '2']);
  });
});

describe('groupByTier', () => {
  it('ティア別にグループ化し各ティア内はpricePerSlot降順', () => {
    const items = [
      makeItem({ id: '1', tier: 'S', pricePerSlot: 120000 }),
      makeItem({ id: '2', tier: 'S', pricePerSlot: 200000 }),
      makeItem({ id: '3', tier: 'D', pricePerSlot: 5000 }),
    ];
    const grouped = groupByTier(items);

    expect(grouped.get('S')!.map((i) => i.id)).toEqual(['2', '1']);
    expect(grouped.get('D')!).toHaveLength(1);
    expect(grouped.get('A')!).toHaveLength(0);
  });

  it('全ティアのキーが存在する', () => {
    const grouped = groupByTier([]);
    for (const tier of TIER_ORDER) {
      expect(grouped.has(tier)).toBe(true);
    }
  });
});

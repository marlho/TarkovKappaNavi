import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlFetch } from './graphql';
import { tasksQuery, mapsQuery, tradersQuery, hideoutQuery, ITEMS_QUERY, ITEM_DETAIL_QUERY } from './queries';
import { normalizeTasks, normalizeMaps, normalizeHideout, normalizeItems, normalizeItemDetail } from './normalize';
import { useLang } from '../i18n';
import { useTierThresholds } from '../stores/tierStore';
import { calcTier } from './normalize';
import type {
  TasksResponse,
  MapsResponse,
  TradersResponse,
  HideoutStationsResponse,
  ItemsResponse,
  ItemDetailResponse,
  NormalizedTasks,
  NormalizedHideout,
  NormalizedItems,
  ItemDetailModel,
  MapModel,
  TraderModel,
} from './types';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

const queryDefaults = {
  staleTime: TWELVE_HOURS,
  gcTime: Infinity,
  retry: 2,
  refetchOnWindowFocus: false,
} as const;

export function useTasks() {
  const lang = useLang();
  return useQuery<NormalizedTasks>({
    queryKey: ['tasks', lang],
    queryFn: async () => {
      const data = await gqlFetch<TasksResponse>(tasksQuery(lang));
      return normalizeTasks(data.tasks);
    },
    ...queryDefaults,
  });
}

export function useMaps() {
  const lang = useLang();
  return useQuery<MapModel[]>({
    queryKey: ['maps', lang],
    queryFn: async () => {
      const data = await gqlFetch<MapsResponse>(mapsQuery(lang));
      return normalizeMaps(data.maps);
    },
    ...queryDefaults,
  });
}

// マップ名を常に英語で取得（ダッシュボードのマップ名表示用）
export function useMapsEn() {
  return useQuery<MapModel[]>({
    queryKey: ['maps', 'en'],
    queryFn: async () => {
      const data = await gqlFetch<MapsResponse>(mapsQuery('en'));
      return normalizeMaps(data.maps);
    },
    ...queryDefaults,
  });
}

export function useTraders() {
  const lang = useLang();
  return useQuery<TraderModel[]>({
    queryKey: ['traders', lang],
    queryFn: async () => {
      const data = await gqlFetch<TradersResponse>(tradersQuery(lang));
      return data.traders.map((t) => ({
        id: t.id,
        name: t.name,
        imageLink: t.imageLink,
      }));
    },
    ...queryDefaults,
  });
}

export function useHideoutStations() {
  const lang = useLang();
  return useQuery<NormalizedHideout>({
    queryKey: ['hideoutStations', lang],
    queryFn: async () => {
      const data = await gqlFetch<HideoutStationsResponse>(hideoutQuery(lang));
      return normalizeHideout(data.hideoutStations);
    },
    ...queryDefaults,
  });
}

export function useItems() {
  const thresholds = useTierThresholds();
  const query = useQuery<NormalizedItems>({
    queryKey: ['items'],
    queryFn: async () => {
      const data = await gqlFetch<ItemsResponse>(ITEMS_QUERY);
      return normalizeItems(data.itemsJa, data.itemsEn);
    },
    ...queryDefaults,
  });

  // カスタム閾値でティアを再計算（useMemoでthresholds変更にも確実に反応）
  const data = useMemo(() => {
    if (!query.data) return query.data;
    const items = query.data.items.map((item) => ({
      ...item,
      tier: calcTier(item.pricePerSlot, thresholds),
    }));
    const itemMap = new Map(items.map((item) => [item.id, item]));
    return { ...query.data, items, itemMap };
  }, [query.data, thresholds]);

  return { ...query, data };
}

export function useItemDetail(id: string | null) {
  return useQuery<ItemDetailModel | null>({
    queryKey: ['itemDetail', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await gqlFetch<ItemDetailResponse>(ITEM_DETAIL_QUERY, { ids: [id] });
      const ja = data.ja[0];
      if (!ja) return null;
      const en = data.en.find((e) => e.id === id);
      return normalizeItemDetail(ja, en ?? { name: '', shortName: '' });
    },
    enabled: !!id,
    ...queryDefaults,
  });
}

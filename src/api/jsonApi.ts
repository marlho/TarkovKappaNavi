import type { Lang } from '../i18n/types';
import type {
  TasksResponse,
  MapsResponse,
  TradersResponse,
  HideoutStationsResponse,
  ItemsResponse,
  ItemDetailResponse,
  ApiItem,
  ApiItemRef,
  ApiCraft,
  ApiItemDetailBarter,
  ApiItemDetailCraft,
  ApiItemDetailTaskRef,
} from './types';

// tarkov.dev の GraphQL API (api.tarkov.dev/graphql) は 2026-07 から停止しているため、
// 静的 JSON API (https://json.tarkov.dev/endpoints) から取得し、
// 既存の GraphQL レスポンスと同じ形に組み立てる。
const BASE_URL = 'https://json.tarkov.dev/regular';
const FALLBACK_LANG: Lang = 'en';

// ─── JSON API 生データ型（使用するフィールドのみ） ───

type Dict<T> = Record<string, T>;

interface JsonTask {
  id: string;
  name: string;
  trader: string;
  map: string | null;
  kappaRequired: boolean;
  minPlayerLevel: number;
  wikiLink: string;
  taskImageLink: string | null;
  taskRequirements: { task: string; status: string[] }[];
  objectives: JsonObjective[];
  startRewards?: JsonRewards;
  finishRewards?: JsonRewards;
}

interface JsonObjective {
  id: string;
  type: string;
  description: string;
  maps?: string[];
  item?: string;
  items?: string[];
  markerItem?: string;
  containsAll?: string[];
  usingWeapon?: string[];
  usingWeaponMods?: string[][];
  wearing?: { id: string }[][];
}

interface JsonRewards {
  items: { item: string; contains?: { item: string }[] }[];
}

interface JsonMap {
  id: string;
  name: string;
  normalizedName: string;
  description: string | null;
  wiki: string | null;
  raidDuration: number | null;
  players: string | null;
  enemies: string[] | null;
  bosses: { mob: string; spawnChance: number; spawnLocations: { name: string; chance: number }[] }[];
  extracts: { id: string; name: string; faction?: string }[];
}

interface JsonMob {
  id: string;
  name: string;
  normalizedName: string;
  imagePortraitLink: string | null;
}

interface JsonTrader {
  id: string;
  name: string;
  normalizedName: string;
  imageLink?: string;
}

interface JsonStation {
  id: string;
  name: string;
  normalizedName: string;
  imageLink: string | null;
  levels: {
    id: string;
    level: number;
    constructionTime: number;
    description: string | null;
    itemRequirements: { item: string; count: number }[];
    stationLevelRequirements: { station: string; level: number }[];
    skillRequirements: { skill: string; level: number }[];
    traderRequirements: { trader: string; requirementType: string; value: number }[];
    bonuses: { type: string; name: string; value: number }[];
  }[];
}

interface JsonTraderPrice {
  trader: string;
  price: number;
  priceRUB: number;
  currency: string;
  minTraderLevel?: number;
}

interface JsonItem {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  iconLink: string | null;
  image512pxLink: string | null;
  wikiLink: string | null;
  types: string[];
  width: number;
  height: number;
  weight: number | null;
  basePrice: number;
  avg24hPrice: number | null;
  low24hPrice?: number | null;
  lastLowPrice: number | null;
  high24hPrice: number | null;
  buyFromTrader: JsonTraderPrice[];
  sellToTrader: JsonTraderPrice[];
}

interface JsonItemCount {
  item: string;
  count: number;
}

interface JsonBarter {
  trader: string;
  minTraderLevel: number;
  taskUnlock: string | null;
  requiredItems: JsonItemCount[];
  offeredItem: JsonItemCount;
}

interface JsonCraft {
  id: string;
  station: string;
  level: number;
  duration: number;
  taskUnlock?: string | null;
  requiredItems: JsonItemCount[];
  productItem: JsonItemCount;
}

// ─── 取得 ───

// 複数のフックが同じエンドポイントを同時に要求するため、短時間だけリクエストを共有する
const SHARE_MS = 60_000;
const inflight = new Map<string, { at: number; promise: Promise<unknown> }>();

function load<T>(path: string): Promise<T> {
  const hit = inflight.get(path);
  if (hit && Date.now() - hit.at < SHARE_MS) return hit.promise as Promise<T>;

  const promise = fetch(`${BASE_URL}/${path}`, { headers: { Accept: 'application/json' } })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`API request failed: ${res.status} ${res.statusText} (${path})`);
      }
      const json = await res.json();
      return json.data as T;
    });
  promise.catch(() => inflight.delete(path));
  inflight.set(path, { at: Date.now(), promise });
  return promise;
}

type Translate = (key: string) => string;

/** 翻訳辞書を取得する。指定言語 → 英語 → キーそのもの の順にフォールバック */
async function loadTranslator(endpoint: string, lang: Lang): Promise<Translate> {
  const [primary, fallback] = await Promise.all([
    load<Dict<string>>(`${endpoint}_${lang}`),
    lang === FALLBACK_LANG ? Promise.resolve({}) : load<Dict<string>>(`${endpoint}_${FALLBACK_LANG}`),
  ]);
  return (key) => primary[key] ?? (fallback as Dict<string>)[key] ?? key;
}

const loadTasksData = () => load<{ tasks: Dict<JsonTask> }>('tasks');
const loadMapsData = () => load<{ maps: Dict<JsonMap>; mobs: Dict<JsonMob> }>('maps');
const loadTradersData = () => load<Dict<JsonTrader>>('traders');
const loadHideoutData = () => load<Dict<JsonStation>>('hideout');
const loadItemsData = () => load<{ items: Dict<JsonItem> }>('items');
const loadBarters = () => load<JsonBarter[]>('barters');
const loadCrafts = () => load<JsonCraft[]>('crafts');

// ─── 共通ヘルパー ───

function itemRefResolver(items: Dict<JsonItem>, tr: Translate) {
  return (id: string): ApiItemRef => {
    const item = items[id];
    return { id, name: item ? tr(item.name) : id, iconLink: item?.iconLink ?? null };
  };
}

/**
 * 目標でアイテムを必要とするタスク（GraphQL の Item.usedInTasks 相当）。
 * sellItem 目標はほぼ全アイテムを列挙するため対象外にする。
 */
function objectiveItemIds(obj: JsonObjective): string[] {
  if (obj.type === 'sellItem') return [];
  return [
    ...(obj.item ? [obj.item] : []),
    ...(obj.items ?? []),
    ...(obj.markerItem ? [obj.markerItem] : []),
    ...(obj.containsAll ?? []),
    ...(obj.usingWeapon ?? []),
    ...(obj.usingWeaponMods ?? []).flat(),
    ...(obj.wearing ?? []).flat().map((w) => w.id),
  ];
}

/** 報酬でアイテムを得られるタスク（GraphQL の Item.receivedFromTasks 相当） */
function rewardItemIds(task: JsonTask): string[] {
  return [task.startRewards, task.finishRewards].flatMap((rewards) =>
    (rewards?.items ?? []).flatMap((r) => [r.item, ...(r.contains ?? []).map((c) => c.item)]),
  );
}

function indexTasksByItem(tasks: JsonTask[], getIds: (task: JsonTask) => string[]): Map<string, JsonTask[]> {
  const index = new Map<string, JsonTask[]>();
  for (const task of tasks) {
    for (const itemId of new Set(getIds(task))) {
      const list = index.get(itemId);
      if (list) list.push(task);
      else index.set(itemId, [task]);
    }
  }
  return index;
}

const usedInTasksIndex = (tasks: JsonTask[]) =>
  indexTasksByItem(tasks, (t) => t.objectives.flatMap(objectiveItemIds));
const receivedFromTasksIndex = (tasks: JsonTask[]) => indexTasksByItem(tasks, rewardItemIds);

// ─── エンドポイント別の組み立て ───

export async function fetchTasks(lang: Lang): Promise<TasksResponse> {
  const [{ tasks }, { maps }, traders, tr, trMap, trTrader] = await Promise.all([
    loadTasksData(),
    loadMapsData(),
    loadTradersData(),
    loadTranslator('tasks', lang),
    loadTranslator('maps', lang),
    loadTranslator('traders', lang),
  ]);
  const mapRef = (id: string) => ({ id, name: maps[id] ? trMap(maps[id].name) : id });

  return {
    tasks: Object.values(tasks).map((t) => ({
      id: t.id,
      name: tr(t.name),
      trader: { id: t.trader, name: traders[t.trader] ? trTrader(traders[t.trader].name) : t.trader },
      map: t.map ? mapRef(t.map) : null,
      kappaRequired: t.kappaRequired,
      minPlayerLevel: t.minPlayerLevel,
      wikiLink: t.wikiLink,
      taskImageLink: t.taskImageLink,
      taskRequirements: t.taskRequirements.map((r) => ({ task: { id: r.task }, status: r.status })),
      objectives: t.objectives.map((o) => ({
        id: o.id,
        type: o.type,
        description: tr(o.description),
        maps: (o.maps ?? []).map(mapRef),
      })),
    })),
  };
}

export async function fetchMaps(lang: Lang): Promise<MapsResponse> {
  const [{ maps, mobs }, tr] = await Promise.all([loadMapsData(), loadTranslator('maps', lang)]);

  return {
    maps: Object.values(maps).map((m) => ({
      id: m.id,
      name: tr(m.name),
      normalizedName: m.normalizedName,
      description: m.description ? tr(m.description) : null,
      wiki: m.wiki,
      raidDuration: m.raidDuration,
      players: m.players,
      enemies: (m.enemies ?? []).map(tr),
      bosses: (m.bosses ?? []).map((b) => {
        const mob = mobs[b.mob];
        return {
          boss: {
            name: tr(mob?.name ?? b.mob),
            normalizedName: mob?.normalizedName ?? b.mob,
            imagePortraitLink: mob?.imagePortraitLink ?? null,
          },
          spawnChance: b.spawnChance,
          spawnLocations: (b.spawnLocations ?? []).map((loc) => ({ name: tr(loc.name), chance: loc.chance })),
        };
      }),
      extracts: (m.extracts ?? []).map((e) => ({
        id: e.id,
        name: tr(e.name),
        faction: e.faction ?? 'shared',
      })),
    })),
  };
}

export async function fetchTraders(lang: Lang): Promise<TradersResponse> {
  const [traders, tr] = await Promise.all([loadTradersData(), loadTranslator('traders', lang)]);
  return {
    traders: Object.values(traders).map((t) => ({ id: t.id, name: tr(t.name), imageLink: t.imageLink })),
  };
}

export async function fetchHideout(lang: Lang): Promise<HideoutStationsResponse> {
  const [stations, { items }, { tasks }, crafts, traders, tr, trItem, trTask, trTrader] = await Promise.all([
    loadHideoutData(),
    loadItemsData(),
    loadTasksData(),
    loadCrafts(),
    loadTradersData(),
    loadTranslator('hideout', lang),
    loadTranslator('items', lang),
    loadTranslator('tasks', lang),
    loadTranslator('traders', lang),
  ]);
  const itemRef = itemRefResolver(items, trItem);
  const stationRef = (id: string) => ({ id, name: stations[id] ? tr(stations[id].name) : id });

  const toCraft = (c: JsonCraft): ApiCraft => ({
    id: c.id,
    station: stationRef(c.station),
    level: c.level,
    taskUnlock: c.taskUnlock
      ? { id: c.taskUnlock, name: tasks[c.taskUnlock] ? trTask(tasks[c.taskUnlock].name) : c.taskUnlock }
      : null,
    duration: c.duration,
    requiredItems: c.requiredItems.map((r) => ({ item: itemRef(r.item), count: r.count })),
    rewardItems: [{ item: itemRef(c.productItem.item), count: c.productItem.count }],
  });

  return {
    hideoutStations: Object.values(stations).map((s) => ({
      id: s.id,
      name: tr(s.name),
      normalizedName: s.normalizedName,
      imageLink: s.imageLink,
      levels: s.levels.map((l) => ({
        id: l.id,
        level: l.level,
        constructionTime: l.constructionTime,
        description: l.description ? tr(l.description) : null,
        itemRequirements: l.itemRequirements.map((r) => ({ item: itemRef(r.item), count: r.count })),
        stationLevelRequirements: l.stationLevelRequirements.map((r) => ({
          station: stationRef(r.station),
          level: r.level,
        })),
        skillRequirements: l.skillRequirements.map((r) => ({ name: tr(r.skill), level: r.level })),
        traderRequirements: l.traderRequirements
          .filter((r) => r.requirementType === 'level')
          .map((r) => ({
            trader: { id: r.trader, name: traders[r.trader] ? trTrader(traders[r.trader].name) : r.trader },
            level: r.value,
          })),
        crafts: crafts.filter((c) => c.station === s.id && c.level === l.level).map(toCraft),
        bonuses: l.bonuses.map((b) => ({ type: b.type, name: tr(b.name), value: b.value })),
      })),
    })),
  };
}

export async function fetchItems(): Promise<ItemsResponse> {
  const [{ items }, { tasks }, traders, trJa, trEn] = await Promise.all([
    loadItemsData(),
    loadTasksData(),
    loadTradersData(),
    loadTranslator('items', 'ja'),
    loadTranslator('items', 'en'),
  ]);
  const taskList = Object.values(tasks);
  const usedIn = usedInTasksIndex(taskList);
  const receivedFrom = receivedFromTasksIndex(taskList);
  const itemList = Object.values(items);

  return {
    itemsJa: itemList.map((i): ApiItem => ({
      id: i.id,
      name: trJa(i.name),
      shortName: trJa(i.shortName),
      iconLink: i.iconLink,
      types: i.types,
      width: i.width,
      height: i.height,
      basePrice: i.basePrice,
      avg24hPrice: i.avg24hPrice,
      low24hPrice: i.low24hPrice ?? null,
      high24hPrice: i.high24hPrice,
      sellFor: [
        ...i.sellToTrader.map((p) => ({
          price: p.price,
          source: traders[p.trader]?.normalizedName ?? p.trader,
          currency: p.currency,
        })),
        ...(!i.types.includes('noFlea') && i.lastLowPrice
          ? [{ price: i.lastLowPrice, source: 'fleaMarket', currency: 'RUB' }]
          : []),
      ],
      usedInTasks: (usedIn.get(i.id) ?? []).map((t) => ({ id: t.id })),
      receivedFromTasks: (receivedFrom.get(i.id) ?? []).map((t) => ({ id: t.id })),
    })),
    itemsEn: itemList.map((i) => ({ id: i.id, name: trEn(i.name), shortName: trEn(i.shortName) })),
  };
}

export async function fetchItemDetail(id: string): Promise<ItemDetailResponse> {
  const [{ items }, { tasks }, traders, stations, barters, crafts, trItem, trItemEn, trTask, trTrader, trHideout] =
    await Promise.all([
      loadItemsData(),
      loadTasksData(),
      loadTradersData(),
      loadHideoutData(),
      loadBarters(),
      loadCrafts(),
      loadTranslator('items', 'ja'),
      loadTranslator('items', 'en'),
      loadTranslator('tasks', 'ja'),
      loadTranslator('traders', 'ja'),
      loadTranslator('hideout', 'ja'),
    ]);
  const item = items[id];
  if (!item) return { ja: [], en: [] };

  const itemRef = itemRefResolver(items, trItem);
  const countRef = (c: JsonItemCount) => ({ item: itemRef(c.item), count: c.count });
  const traderName = (traderId: string) => (traders[traderId] ? trTrader(traders[traderId].name) : traderId);
  const taskName = (taskId: string) => (tasks[taskId] ? trTask(tasks[taskId].name) : taskId);
  const taskList = Object.values(tasks);

  const toTaskRef = (t: JsonTask, withKappa: boolean): ApiItemDetailTaskRef => ({
    id: t.id,
    name: trTask(t.name),
    trader: { name: traderName(t.trader) },
    ...(withKappa && { kappaRequired: t.kappaRequired }),
  });
  const toBarter = (b: JsonBarter): ApiItemDetailBarter => ({
    trader: { name: traderName(b.trader) },
    level: b.minTraderLevel,
    taskUnlock: b.taskUnlock ? { name: taskName(b.taskUnlock) } : null,
    requiredItems: b.requiredItems.map(countRef),
    rewardItems: [countRef(b.offeredItem)],
  });
  const toCraft = (c: JsonCraft): ApiItemDetailCraft => ({
    station: { name: stations[c.station] ? trHideout(stations[c.station].name) : c.station },
    level: c.level,
    duration: c.duration,
    requiredItems: c.requiredItems.map(countRef),
    rewardItems: [countRef(c.productItem)],
  });

  const fleaBuyPrice = item.avg24hPrice || item.lastLowPrice;

  return {
    ja: [
      {
        id: item.id,
        name: trItem(item.name),
        shortName: trItem(item.shortName),
        description: item.description ? trItem(item.description) : null,
        image512pxLink: item.image512pxLink,
        wikiLink: item.wikiLink,
        weight: item.weight,
        width: item.width,
        height: item.height,
        buyFor: [
          ...item.buyFromTrader.map((p) => ({
            price: p.price,
            source: traders[p.trader]?.normalizedName ?? p.trader,
            currency: p.currency,
            priceRUB: p.priceRUB,
            requirements: [{ type: 'loyaltyLevel', value: p.minTraderLevel ?? 1 }],
          })),
          ...(!item.types.includes('noFlea') && item.lastLowPrice && fleaBuyPrice
            ? [{ price: fleaBuyPrice, source: 'fleaMarket', currency: 'RUB', priceRUB: fleaBuyPrice, requirements: [] }]
            : []),
        ],
        usedInTasks: (usedInTasksIndex(taskList).get(id) ?? []).map((t) => toTaskRef(t, true)),
        receivedFromTasks: (receivedFromTasksIndex(taskList).get(id) ?? []).map((t) => toTaskRef(t, false)),
        bartersFor: barters.filter((b) => b.offeredItem.item === id).map(toBarter),
        bartersUsing: barters.filter((b) => b.requiredItems.some((r) => r.item === id)).map(toBarter),
        craftsFor: crafts.filter((c) => c.productItem.item === id).map(toCraft),
        craftsUsing: crafts.filter((c) => c.requiredItems.some((r) => r.item === id)).map(toCraft),
      },
    ],
    en: [{ id: item.id, name: trItemEn(item.name), shortName: trItemEn(item.shortName) }],
  };
}

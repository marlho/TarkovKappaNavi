import type {
  ApiTask, ApiMap, QuestModel, MapModel, Objective, NormalizedTasks,
  ApiHideoutStation, HideoutStationModel, HideoutLevelModel, CraftModel,
  NormalizedHideout, HideoutDependencyEdge, ItemRequirement,
  ApiItem, ApiItemNameOnly, ItemModel, NormalizedItems, PriceTier,
  ApiItemDetailFull, ItemDetailModel, ItemDetailBuyPrice, ItemDetailTaskRef,
  ItemDetailBarter, ItemDetailCraft, ItemDetailBarterItem,
} from './types';

function normalizeObjective(obj: ApiTask['objectives'][number]): Objective {
  return {
    id: obj.id,
    type: obj.type,
    description: obj.description,
    mapIds: obj.maps.map((m) => m.id),
  };
}

/**
 * taskRequirementsから前提タスクIDを抽出する。
 * statusに"complete"を含む要件を前提条件とみなす。
 */
function extractPrereqIds(reqs: ApiTask['taskRequirements']): string[] {
  return reqs
    .filter((r) => r.status.some((s) => s.toLowerCase().includes('complete')))
    .map((r) => r.task.id);
}

function normalizeTask(raw: ApiTask): QuestModel {
  return {
    id: raw.id,
    name: raw.name,
    traderId: raw.trader.id,
    traderName: raw.trader.name,
    mapId: raw.map?.id ?? null,
    mapName: raw.map?.name ?? null,
    kappaRequired: raw.kappaRequired,
    minPlayerLevel: raw.minPlayerLevel,
    wikiLink: raw.wikiLink,
    imageLink: raw.taskImageLink ?? null,
    prereqIds: extractPrereqIds(raw.taskRequirements),
    objectives: raw.objectives.map(normalizeObjective),
  };
}

export function normalizeTasks(rawTasks: ApiTask[]): NormalizedTasks {
  const quests = rawTasks.map(normalizeTask);

  const questMap = new Map<string, QuestModel>();
  const prereqEdges = new Map<string, string[]>();

  for (const q of quests) {
    questMap.set(q.id, q);
    if (q.prereqIds.length > 0) {
      prereqEdges.set(q.id, q.prereqIds);
    }
  }

  return { quests, questMap, prereqEdges };
}

// ─── ハイドアウト正規化 ───

function normalizeItemReq(raw: { item: { id: string; name: string; iconLink: string | null }; count: number }): ItemRequirement {
  return { itemId: raw.item.id, itemName: raw.item.name, iconLink: raw.item.iconLink, count: raw.count };
}

function normalizeCraft(raw: ApiHideoutStation['levels'][number]['crafts'][number], stationId: string): CraftModel {
  return {
    id: raw.id,
    stationId,
    level: raw.level,
    taskUnlockId: raw.taskUnlock?.id ?? null,
    taskUnlockName: raw.taskUnlock?.name ?? null,
    duration: raw.duration,
    requiredItems: raw.requiredItems.map(normalizeItemReq),
    rewardItems: raw.rewardItems.map(normalizeItemReq),
  };
}

function normalizeHideoutLevel(raw: ApiHideoutStation['levels'][number], stationId: string): HideoutLevelModel {
  return {
    id: raw.id,
    stationId,
    level: raw.level,
    constructionTime: raw.constructionTime,
    description: raw.description,
    itemRequirements: raw.itemRequirements.map(normalizeItemReq),
    stationLevelRequirements: raw.stationLevelRequirements.map((r) => ({
      stationId: r.station.id,
      stationName: r.station.name,
      level: r.level,
    })),
    skillRequirements: raw.skillRequirements.map((r) => ({ name: r.name, level: r.level })),
    traderRequirements: raw.traderRequirements.map((r) => ({
      traderId: r.trader.id,
      traderName: r.trader.name,
      level: r.level,
    })),
    crafts: raw.crafts.map((c) => normalizeCraft(c, stationId)),
    bonuses: raw.bonuses.map((b) => ({ type: b.type, name: b.name, value: b.value })),
  };
}

export function normalizeHideout(rawStations: ApiHideoutStation[]): NormalizedHideout {
  const stations: HideoutStationModel[] = rawStations.map((s) => ({
    id: s.id,
    name: s.name,
    normalizedName: s.normalizedName,
    imageLink: s.imageLink,
    levels: s.levels.map((l) => normalizeHideoutLevel(l, s.id)),
    maxLevel: Math.max(0, ...s.levels.map((l) => l.level)),
  }));

  const stationMap = new Map<string, HideoutStationModel>();
  const levelMap = new Map<string, HideoutLevelModel>();
  const dependencyEdges: HideoutDependencyEdge[] = [];

  for (const station of stations) {
    stationMap.set(station.id, station);
    for (const level of station.levels) {
      levelMap.set(level.id, level);

      // 他ステーション要件からエッジを構築
      for (const req of level.stationLevelRequirements) {
        dependencyEdges.push({
          fromStationId: req.stationId,
          fromLevel: req.level,
          toStationId: station.id,
          toLevel: level.level,
        });
      }
    }
  }

  return { stations, stationMap, levelMap, dependencyEdges };
}

// ─── アイテム正規化 ───

export function calcTier(pricePerSlot: number, thresholds?: { S: number; A: number; B: number; C: number }): PriceTier {
  const t = thresholds ?? { S: 100_000, A: 50_000, B: 20_000, C: 10_000 };
  if (pricePerSlot >= t.S) return 'S';
  if (pricePerSlot >= t.A) return 'A';
  if (pricePerSlot >= t.B) return 'B';
  if (pricePerSlot >= t.C) return 'C';
  return 'D';
}

function normalizeItem(raw: ApiItem, enNames: { name: string; shortName: string }): ItemModel {
  const slots = raw.width * raw.height || 1;

  // RUB売却価格の最大値を算出
  const rubSellPrices = raw.sellFor
    .filter((s) => s.currency === 'RUB')
    .map((s) => ({ price: s.price, source: s.source }));

  // フリマ価格（avg24h）も候補に含める
  const fleaPrice = raw.avg24hPrice ?? null;
  if (fleaPrice && fleaPrice > 0) {
    rubSellPrices.push({ price: fleaPrice, source: 'fleaMarket' });
  }

  let bestSellPrice = 0;
  let bestSellSource = '-';
  for (const sp of rubSellPrices) {
    if (sp.price > bestSellPrice) {
      bestSellPrice = sp.price;
      bestSellSource = sp.source;
    }
  }

  const pricePerSlot = Math.round(bestSellPrice / slots);

  return {
    id: raw.id,
    name: raw.name,
    nameEn: enNames.name,
    shortName: raw.shortName,
    shortNameEn: enNames.shortName,
    iconLink: raw.iconLink,
    types: raw.types,
    slots,
    basePrice: raw.basePrice,
    fleaPrice,
    bestSellPrice,
    bestSellSource,
    pricePerSlot,
    tier: calcTier(pricePerSlot),
    hasTaskUsage: raw.usedInTasks.length > 0,
    hasTaskReward: raw.receivedFromTasks.length > 0,
    usedInTaskIds: raw.usedInTasks.map((t) => t.id),
  };
}

export function normalizeItems(rawItems: ApiItem[], rawEn: ApiItemNameOnly[]): NormalizedItems {
  const enMap = new Map(rawEn.map((e) => [e.id, { name: e.name, shortName: e.shortName }]));
  const fallback = { name: '', shortName: '' };
  const items = rawItems.map((raw) => normalizeItem(raw, enMap.get(raw.id) ?? fallback));
  const itemMap = new Map<string, ItemModel>();
  const typeSet = new Set<string>();

  for (const item of items) {
    itemMap.set(item.id, item);
    for (const t of item.types) {
      typeSet.add(t);
    }
  }

  const availableTypes = Array.from(typeSet).sort();
  return { items, itemMap, availableTypes };
}

// ─── アイテム詳細正規化 ───

function normalizeDetailBarterItem(raw: { item: { name: string; iconLink: string | null }; count: number }): ItemDetailBarterItem {
  return { name: raw.item.name, iconLink: raw.item.iconLink, count: raw.count };
}

function normalizeDetailBuyPrice(raw: ApiItemDetailFull['buyFor'][number]): ItemDetailBuyPrice {
  const loyaltyReq = raw.requirements.find((r) => r.type === 'loyaltyLevel');
  return {
    price: raw.price,
    source: raw.source,
    currency: raw.currency,
    priceRUB: raw.priceRUB,
    loyaltyLevel: loyaltyReq ? loyaltyReq.value : null,
  };
}

function normalizeDetailTaskRef(raw: ApiItemDetailFull['usedInTasks'][number]): ItemDetailTaskRef {
  return {
    id: raw.id,
    name: raw.name,
    traderName: raw.trader.name,
    kappaRequired: raw.kappaRequired ?? false,
  };
}

function normalizeDetailBarter(raw: ApiItemDetailFull['bartersFor'][number]): ItemDetailBarter {
  return {
    traderName: raw.trader.name,
    level: raw.level,
    taskUnlockName: raw.taskUnlock?.name ?? null,
    requiredItems: raw.requiredItems.map(normalizeDetailBarterItem),
    rewardItems: raw.rewardItems.map(normalizeDetailBarterItem),
  };
}

function normalizeDetailCraft(raw: ApiItemDetailFull['craftsFor'][number]): ItemDetailCraft {
  return {
    stationName: raw.station.name,
    level: raw.level,
    duration: raw.duration,
    requiredItems: raw.requiredItems.map(normalizeDetailBarterItem),
    rewardItems: raw.rewardItems.map(normalizeDetailBarterItem),
  };
}

export function normalizeItemDetail(
  raw: ApiItemDetailFull,
  enNames: { name: string; shortName: string },
): ItemDetailModel {
  return {
    id: raw.id,
    name: raw.name,
    nameEn: enNames.name,
    shortName: raw.shortName,
    shortNameEn: enNames.shortName,
    description: raw.description,
    image512pxLink: raw.image512pxLink,
    wikiLink: raw.wikiLink,
    weight: raw.weight,
    width: raw.width,
    height: raw.height,
    buyFor: raw.buyFor.map(normalizeDetailBuyPrice),
    usedInTasks: raw.usedInTasks.map(normalizeDetailTaskRef),
    receivedFromTasks: raw.receivedFromTasks.map(normalizeDetailTaskRef),
    bartersFor: raw.bartersFor.map(normalizeDetailBarter),
    bartersUsing: raw.bartersUsing.map(normalizeDetailBarter),
    craftsFor: raw.craftsFor.map(normalizeDetailCraft),
    craftsUsing: raw.craftsUsing.map(normalizeDetailCraft),
  };
}

export function normalizeMaps(rawMaps: ApiMap[]): MapModel[] {
  return rawMaps.map((m) => ({
    id: m.id,
    name: m.name,
    normalizedName: m.normalizedName,
    description: m.description,
    wiki: m.wiki,
    raidDuration: m.raidDuration,
    players: m.players,
    enemies: m.enemies ?? [],
    bosses: (m.bosses ?? []).map((b) => ({
      name: b.boss.name,
      normalizedName: b.boss.normalizedName,
      imagePortraitLink: b.boss.imagePortraitLink,
      spawnChance: b.spawnChance,
      spawnLocationNames: (b.spawnLocations ?? []).map((loc) => loc.name),
    })),
    extracts: (m.extracts ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      faction: e.faction,
    })),
  }));
}

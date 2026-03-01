// ─── API生レスポンス型 ───

export interface ApiRef {
  id: string;
  name: string;
}

export interface ApiTaskRequirement {
  task: { id: string };
  status: string[];
}

export interface ApiObjective {
  id: string;
  type: string;
  description: string;
  maps: ApiRef[];
}

export interface ApiTask {
  id: string;
  name: string;
  trader: ApiRef;
  map: ApiRef | null;
  kappaRequired: boolean;
  minPlayerLevel: number;
  wikiLink: string;
  taskImageLink: string | null;
  taskRequirements: ApiTaskRequirement[];
  objectives: ApiObjective[];
}

export interface TasksResponse {
  tasks: ApiTask[];
}


export interface ApiBossSpawnLocation {
  name: string;
  chance: number;
}

export interface ApiBossSpawn {
  boss: { name: string; normalizedName: string; imagePortraitLink: string | null };
  spawnChance: number;
  spawnLocations: ApiBossSpawnLocation[];
}

export interface ApiMapExtract {
  id: string;
  name: string;
  faction: string;
}

export interface ApiMap {
  id: string;
  name: string;
  normalizedName: string;
  description: string | null;
  wiki: string | null;
  raidDuration: number | null;
  players: string | null;
  enemies: string[] | null;
  bosses: ApiBossSpawn[];
  extracts: ApiMapExtract[] | null;
}

export interface MapsResponse {
  maps: ApiMap[];
}

export interface ApiTrader {
  id: string;
  name: string;
  imageLink?: string;
}

export interface TradersResponse {
  traders: ApiTrader[];
}

// ─── 正規化済みドメインモデル ───

export interface Objective {
  id: string;
  type: string;
  description: string;
  mapIds: string[];
}

export interface QuestModel {
  id: string;
  name: string;
  traderId: string;
  traderName: string;
  mapId: string | null;
  mapName: string | null;
  kappaRequired: boolean;
  minPlayerLevel: number;
  wikiLink: string;
  imageLink: string | null;
  prereqIds: string[];
  objectives: Objective[];
}

export interface BossSpawnModel {
  name: string;
  normalizedName: string;
  imagePortraitLink: string | null;
  spawnChance: number;
  spawnLocationNames: string[];
}

export interface ExtractModel {
  id: string;
  name: string;
  faction: string;
}

export interface MapModel {
  id: string;
  name: string;
  normalizedName: string;
  description: string | null;
  wiki: string | null;
  raidDuration: number | null;
  players: string | null;
  enemies: string[];
  bosses: BossSpawnModel[];
  extracts: ExtractModel[];
}

export interface TraderModel {
  id: string;
  name: string;
  imageLink?: string;
}

/** ビルド済みルックアップ構造 */
export interface NormalizedTasks {
  quests: QuestModel[];
  questMap: Map<string, QuestModel>;
  /** タスクID → 前提タスクIDの配列 */
  prereqEdges: Map<string, string[]>;
}

// ─── アイテム API生レスポンス型 ───

export interface ApiItemSellPrice {
  price: number;
  source: string;
  currency: string;
}

export interface ApiItem {
  id: string;
  name: string;
  shortName: string;
  iconLink: string | null;
  types: string[];
  width: number;
  height: number;
  basePrice: number;
  avg24hPrice: number | null;
  low24hPrice: number | null;
  high24hPrice: number | null;
  sellFor: ApiItemSellPrice[];
  usedInTasks: { id: string }[];
  receivedFromTasks: { id: string }[];
}

export interface ApiItemNameOnly {
  id: string;
  name: string;
  shortName: string;
}

export interface ItemsResponse {
  itemsJa: ApiItem[];
  itemsEn: ApiItemNameOnly[];
}

// ─── アイテム 正規化済みドメインモデル ───

export type PriceTier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface ItemModel {
  id: string;
  name: string;
  nameEn: string;
  shortName: string;
  shortNameEn: string;
  iconLink: string | null;
  types: string[];
  slots: number;
  basePrice: number;
  fleaPrice: number | null;
  bestSellPrice: number;
  bestSellSource: string;
  pricePerSlot: number;
  tier: PriceTier;
  hasTaskUsage: boolean;
  hasTaskReward: boolean;
  usedInTaskIds: string[];
}

export interface NormalizedItems {
  items: ItemModel[];
  itemMap: Map<string, ItemModel>;
  availableTypes: string[];
}

// ─── アイテム詳細 API生レスポンス型 ───

export interface ApiItemDetailBuyRequirement {
  type: string;
  value: number;
}

export interface ApiItemDetailBuyPrice {
  price: number;
  source: string;
  currency: string;
  priceRUB: number;
  requirements: ApiItemDetailBuyRequirement[];
}

export interface ApiItemDetailTaskRef {
  id: string;
  name: string;
  trader: { name: string };
  kappaRequired?: boolean;
}

export interface ApiItemDetailBarterItem {
  item: { name: string; iconLink: string | null };
  count: number;
}

export interface ApiItemDetailBarter {
  trader: { name: string };
  level: number;
  taskUnlock: { name: string } | null;
  requiredItems: ApiItemDetailBarterItem[];
  rewardItems: ApiItemDetailBarterItem[];
}

export interface ApiItemDetailCraftItem {
  item: { name: string; iconLink: string | null };
  count: number;
}

export interface ApiItemDetailCraft {
  station: { name: string };
  level: number;
  duration: number;
  requiredItems: ApiItemDetailCraftItem[];
  rewardItems: ApiItemDetailCraftItem[];
}

export interface ApiItemDetailFull {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  image512pxLink: string | null;
  wikiLink: string | null;
  weight: number | null;
  width: number;
  height: number;
  buyFor: ApiItemDetailBuyPrice[];
  usedInTasks: ApiItemDetailTaskRef[];
  receivedFromTasks: ApiItemDetailTaskRef[];
  bartersFor: ApiItemDetailBarter[];
  bartersUsing: ApiItemDetailBarter[];
  craftsFor: ApiItemDetailCraft[];
  craftsUsing: ApiItemDetailCraft[];
}

export interface ItemDetailResponse {
  ja: ApiItemDetailFull[];
  en: ApiItemNameOnly[];
}

// ─── アイテム詳細 正規化済みモデル ───

export interface ItemDetailBuyPrice {
  price: number;
  source: string;
  currency: string;
  priceRUB: number;
  loyaltyLevel: number | null;
}

export interface ItemDetailTaskRef {
  id: string;
  name: string;
  traderName: string;
  kappaRequired: boolean;
}

export interface ItemDetailBarterItem {
  name: string;
  iconLink: string | null;
  count: number;
}

export interface ItemDetailBarter {
  traderName: string;
  level: number;
  taskUnlockName: string | null;
  requiredItems: ItemDetailBarterItem[];
  rewardItems: ItemDetailBarterItem[];
}

export interface ItemDetailCraft {
  stationName: string;
  level: number;
  duration: number;
  requiredItems: ItemDetailBarterItem[];
  rewardItems: ItemDetailBarterItem[];
}

export interface ItemDetailModel {
  id: string;
  name: string;
  nameEn: string;
  shortName: string;
  shortNameEn: string;
  description: string | null;
  image512pxLink: string | null;
  wikiLink: string | null;
  weight: number | null;
  width: number;
  height: number;
  buyFor: ItemDetailBuyPrice[];
  usedInTasks: ItemDetailTaskRef[];
  receivedFromTasks: ItemDetailTaskRef[];
  bartersFor: ItemDetailBarter[];
  bartersUsing: ItemDetailBarter[];
  craftsFor: ItemDetailCraft[];
  craftsUsing: ItemDetailCraft[];
}

// ─── ハイドアウト API生レスポンス型 ───

export interface ApiItemRef {
  id: string;
  name: string;
  iconLink: string | null;
}

export interface ApiHideoutItemRequirement {
  item: ApiItemRef;
  count: number;
}

export interface ApiHideoutStationLevelRequirement {
  station: { id: string; name: string };
  level: number;
}

export interface ApiHideoutSkillRequirement {
  name: string;
  level: number;
}

export interface ApiHideoutTraderRequirement {
  trader: { id: string; name: string };
  level: number;
}

export interface ApiHideoutBonus {
  type: string;
  name: string;
  value: number;
}

export interface ApiCraftItem {
  item: ApiItemRef;
  count: number;
}

export interface ApiCraft {
  id: string;
  station: { id: string; name: string };
  level: number;
  taskUnlock: { id: string; name: string } | null;
  duration: number;
  requiredItems: ApiCraftItem[];
  rewardItems: ApiCraftItem[];
}

export interface ApiHideoutStationLevel {
  id: string;
  level: number;
  constructionTime: number;
  description: string | null;
  itemRequirements: ApiHideoutItemRequirement[];
  stationLevelRequirements: ApiHideoutStationLevelRequirement[];
  skillRequirements: ApiHideoutSkillRequirement[];
  traderRequirements: ApiHideoutTraderRequirement[];
  crafts: ApiCraft[];
  bonuses: ApiHideoutBonus[];
}

export interface ApiHideoutStation {
  id: string;
  name: string;
  normalizedName: string;
  imageLink: string | null;
  levels: ApiHideoutStationLevel[];
}

export interface HideoutStationsResponse {
  hideoutStations: ApiHideoutStation[];
}

// ─── ハイドアウト 正規化済みドメインモデル ───

export interface ItemRequirement {
  itemId: string;
  itemName: string;
  iconLink: string | null;
  count: number;
}

export interface StationLevelRequirement {
  stationId: string;
  stationName: string;
  level: number;
}

export interface SkillRequirement {
  name: string;
  level: number;
}

export interface TraderRequirement {
  traderId: string;
  traderName: string;
  level: number;
}

export interface BonusModel {
  type: string;
  name: string;
  value: number;
}

export interface CraftModel {
  id: string;
  stationId: string;
  level: number;
  taskUnlockId: string | null;
  taskUnlockName: string | null;
  duration: number;
  requiredItems: ItemRequirement[];
  rewardItems: ItemRequirement[];
}

export interface HideoutLevelModel {
  id: string;
  stationId: string;
  level: number;
  constructionTime: number;
  description: string | null;
  itemRequirements: ItemRequirement[];
  stationLevelRequirements: StationLevelRequirement[];
  skillRequirements: SkillRequirement[];
  traderRequirements: TraderRequirement[];
  crafts: CraftModel[];
  bonuses: BonusModel[];
}

export interface HideoutStationModel {
  id: string;
  name: string;
  normalizedName: string;
  imageLink: string | null;
  levels: HideoutLevelModel[];
  maxLevel: number;
}

/** 依存エッジ: stationLevelRequirementsから構築 */
export interface HideoutDependencyEdge {
  fromStationId: string;
  fromLevel: number;
  toStationId: string;
  toLevel: number;
}

export interface NormalizedHideout {
  stations: HideoutStationModel[];
  stationMap: Map<string, HideoutStationModel>;
  levelMap: Map<string, HideoutLevelModel>;
  dependencyEdges: HideoutDependencyEdge[];
}

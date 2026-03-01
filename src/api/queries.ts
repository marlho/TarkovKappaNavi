import type { Lang } from '../i18n/types';

export const tasksQuery = (lang: Lang) => `{
  tasks(lang: ${lang}) {
    id
    name
    trader { id name }
    map { id name }
    kappaRequired
    minPlayerLevel
    wikiLink
    taskImageLink
    taskRequirements {
      task { id }
      status
    }
    objectives {
      id
      type
      description
      maps { id name }
    }
  }
}`;

export const mapsQuery = (lang: Lang) => `{
  maps(lang: ${lang}) {
    id
    name
    normalizedName
    description
    wiki
    raidDuration
    players
    enemies
    bosses {
      boss { name normalizedName imagePortraitLink }
      spawnChance
      spawnLocations { name chance }
    }
    extracts {
      id
      name
      faction
    }
  }
}`;

export const tradersQuery = (lang: Lang) => `{
  traders(lang: ${lang}) {
    id
    name
    imageLink
  }
}`;

export const ITEMS_QUERY = `{
  itemsJa: items(lang: ja) {
    id name shortName iconLink types width height
    basePrice avg24hPrice low24hPrice high24hPrice
    sellFor { price source currency }
    usedInTasks { id }
    receivedFromTasks { id }
  }
  itemsEn: items(lang: en) {
    id name shortName
  }
}`;

export const ITEM_DETAIL_QUERY = `query($ids: [ID]) {
  ja: items(ids: $ids, lang: ja) {
    id name shortName description image512pxLink wikiLink weight width height
    buyFor { price source currency priceRUB requirements { type value } }
    usedInTasks { id name trader { name } kappaRequired }
    receivedFromTasks { id name trader { name } }
    bartersFor { trader { name } level taskUnlock { name }
      requiredItems { item { name iconLink } count }
      rewardItems { item { name iconLink } count } }
    bartersUsing { trader { name } level taskUnlock { name }
      requiredItems { item { name iconLink } count }
      rewardItems { item { name iconLink } count } }
    craftsFor { station { name } level duration
      requiredItems { item { name iconLink } count }
      rewardItems { item { name iconLink } count } }
    craftsUsing { station { name } level duration
      requiredItems { item { name iconLink } count }
      rewardItems { item { name iconLink } count } }
  }
  en: items(ids: $ids, lang: en) { id name shortName }
}`;

export const hideoutQuery = (lang: Lang) => `{
  hideoutStations(lang: ${lang}) {
    id name normalizedName imageLink
    levels {
      id level constructionTime description
      itemRequirements { item { id name iconLink } count }
      stationLevelRequirements { station { id name } level }
      skillRequirements { name level }
      traderRequirements { trader { id name } level }
      crafts {
        id
        station { id name }
        level
        taskUnlock { id name }
        duration
        requiredItems { item { id name iconLink } count }
        rewardItems { item { id name iconLink } count }
      }
      bonuses { type name value }
    }
  }
}`;

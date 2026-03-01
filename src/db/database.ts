import Dexie, { type Table } from 'dexie';
import type { Profile, ProgressRow, NowPins, NoteRow, ProgressLog, HideoutProgressRow, MapPinRow, HideoutItemInventoryRow, HideoutLevelInventoryRow, PinPresetRow } from './types';

export class TarkovKappaNaviDB extends Dexie {
  profile!: Table<Profile, string>;
  progress!: Table<ProgressRow, string>;
  nowPins!: Table<NowPins, string>;
  notes!: Table<NoteRow, string>;
  logs!: Table<ProgressLog, number>;
  hideoutProgress!: Table<HideoutProgressRow, string>;
  mapPins!: Table<MapPinRow, string>;
  hideoutInventory!: Table<HideoutItemInventoryRow, string>;
  hideoutLevelInventory!: Table<HideoutLevelInventoryRow, [string, string]>;
  pinPresets!: Table<PinPresetRow, string>;

  constructor() {
    super('TarkovKappaNaviDB');

    this.version(1).stores({
      profile: 'id',
      progress: 'taskId, status',
      nowPins: 'id',
      notes: 'taskId',
      logs: '++id, taskId, at',
      hideoutProgress: 'levelId, stationId',
      mapPins: 'id, [mapId+wipeId+viewMode]',
      hideoutInventory: 'itemId',
      hideoutLevelInventory: '[levelId+itemId], itemId',
      pinPresets: 'id, createdAt',
    });
  }
}

export const db = new TarkovKappaNaviDB();

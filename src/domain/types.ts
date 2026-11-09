export type AttrId = 'str' | 'dex' | 'per' | 'int' | 'cha' | 'spi';
export const ATTRS: AttrId[] = ['str', 'dex', 'per', 'int', 'cha', 'spi'];

export type AcquisitionType = 'starting' | 'purchased' | 'received';

export interface CustomItem {
  name: string;
  description?: string;
}

export interface InventoryItem {
  instanceId: string;
  catalogId: string | null;
  customItem: CustomItem | null;
  quantity: number;
  acquisitionType: AcquisitionType;
  /** Цена за единицу на момент покупки; null для полученных и стартовых вещей */
  purchasePrice: number | null;
  equipped: boolean;
  /** Игрок подтвердил разрешение мастера (Соулер) */
  masterApproved?: boolean;
  /** Доступ потерян (сняли Тень), предмет сохранён как недоступный */
  accessConflict?: boolean;
}

/** Происхождение и распределение — общее для черновика, персонажа и правок */
export interface Build {
  raceId: string | null;
  subraceId: string | null;
  freeRaceBonus: AttrId | null;
  attributeInvestments: Partial<Record<AttrId, number>>;
  skillInvestments: Record<string, number>;
  attributeAdjustments: Partial<Record<AttrId, number>>;
  skillAdjustments: Record<string, number>;
}

export interface Character extends Build {
  id: string;
  schemaVersion: number;
  contentVersion: string;
  name: string;
  portraitId: string;
  notes: string;
  orderIds: string[];
  inventory: InventoryItem[];
  startingCurrency: number;
  currentCurrency: number;
  healthCurrent: number;
  moraleCurrent: number;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
}

export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CreationDraft extends Build {
  id: string;
  schemaVersion: number;
  currentStep: Step;
  startingCurrency: number;
  purchases: InventoryItem[];
  orderIds: string[];
  name: string;
  portraitId: string | null;
  notes: string;
  lastSavedAt: number;
}

export interface PlayerProfile {
  id: 'local';
  displayName: string;
  portraitId: string;
  accountStatus: 'basic' | 'premium';
}

export interface Race {
  id: string;
  name: string;
  bonuses: Partial<Record<AttrId, number>>;
  subraces: string[];
  portrait: string;
  freeBonus: { count: number; exclude: AttrId[] } | null;
  tagline: string;
  singular: string;
  description: string;
}

export interface Trait {
  id: string;
  name: string;
  text: string;
  automaticEffect: null;
  placeholder?: boolean;
}

export interface Subrace {
  id: string;
  name: string;
  raceId: string;
  physicalBase: number;
  mentalBase: number;
  baseValuesStatus: string;
  portrait: string;
  traits: Trait[];
  conditionalNotes: string[];
  singular: string;
}

export interface Skill {
  id: string;
  name: string;
  attribute: AttrId;
  description: string;
  kind: 'skill' | 'proficiency';
}

export interface Weapon {
  id: string;
  name: string;
  diceCount: number;
  diceSides: number;
  actionCost: number;
  proficiency: string;
  damageAttribute: AttrId | null;
  area: string;
  price: number | null;
  accessOrder: string | null;
  starterSelectable: boolean;
}

export interface Order {
  id: string;
  name: string;
  rank: null;
  founder: string | null;
  requirementsEnforced: boolean;
  description: string;
}

export interface Article {
  id: string;
  title: string;
  body: string;
}

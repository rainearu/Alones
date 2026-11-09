import { CONTENT_VERSION, RULES, SCHEMA_VERSION, getRace, getWeapon } from './content';
import { adjustCurrent, emptyBuild, healthMax, moraleMax } from './rules';
import type { Build, Character, CreationDraft, InventoryItem } from './types';

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export const STARTER_KIT_NAME = 'Стартовый набор';

export function starterKit(): InventoryItem {
  return {
    instanceId: uid(), catalogId: null,
    customItem: { name: STARTER_KIT_NAME, description: 'Одежда, обувь и браслет' },
    quantity: 1, acquisitionType: 'starting', purchasePrice: 0, equipped: true,
  };
}

export function newDraft(): CreationDraft {
  return {
    ...emptyBuild(), id: uid(), schemaVersion: SCHEMA_VERSION, currentStep: 1,
    startingCurrency: RULES.startCurrency, purchases: [], orderIds: [], name: '', portraitId: null, notes: '',
    lastSavedAt: Date.now(),
  };
}

export const itemCost = (i: InventoryItem) => (i.acquisitionType === 'purchased' ? (i.purchasePrice ?? 0) * i.quantity : 0);
export const purchasesTotal = (items: InventoryItem[]) => items.reduce((a, i) => a + itemCost(i), 0);
export const draftCurrency = (d: CreationDraft) => d.startingCurrency - purchasesTotal(d.purchases);

export const itemName = (i: InventoryItem) => i.customItem?.name ?? getWeapon(i.catalogId)?.name ?? 'Предмет';

export function validMoney(v: number) {
  return Number.isFinite(v) && v >= 0;
}
export function validQuantity(v: number) {
  return Number.isInteger(v) && v >= 1;
}

export type NewItemInput = {
  catalogId: string | null;
  customItem: InventoryItem['customItem'];
  quantity: number;
  acquisitionType: 'purchased' | 'received';
  price: number | null;
  masterApproved?: boolean;
};

export type ItemCheck = { ok: true; cost: number } | { ok: false; reason: string };

export function checkNewItem(input: NewItemInput, funds: number): ItemCheck {
  if (!input.catalogId && !input.customItem?.name.trim()) return { ok: false, reason: 'Укажи название предмета.' };
  if (!validQuantity(input.quantity)) return { ok: false, reason: 'Количество — целое число от 1.' };
  if (input.acquisitionType === 'received') return { ok: true, cost: 0 };
  if (input.price === null || !validMoney(input.price)) return { ok: false, reason: 'Укажи цену, согласованную с мастером.' };
  const cost = input.price * input.quantity;
  if (cost > funds) return { ok: false, reason: `Не хватает средств: нужно ${cost} Пи, доступно ${funds} Пи.` };
  return { ok: true, cost };
}

export function makeItem(input: NewItemInput): InventoryItem {
  return {
    instanceId: uid(), catalogId: input.catalogId,
    customItem: input.customItem ? { name: input.customItem.name.trim(), description: input.customItem.description?.trim() || undefined } : null,
    quantity: input.quantity, acquisitionType: input.acquisitionType,
    purchasePrice: input.acquisitionType === 'purchased' ? input.price : null,
    equipped: false, masterApproved: input.masterApproved || undefined,
  };
}

// ---------- Соулер и Тень ----------

export function itemNeedsOrder(i: InventoryItem): string | null {
  return getWeapon(i.catalogId)?.accessOrder ?? null;
}

/** Предметы, которые потеряют доступ, если в персонаже останутся только эти ордена */
export function accessConflicts(items: InventoryItem[], orderIds: string[]) {
  return items.filter((i) => {
    const need = itemNeedsOrder(i);
    return need && !orderIds.includes(need) && !i.accessConflict;
  });
}

/** Применить выбор игрока при конфликте доступа */
export function resolveAccess(items: InventoryItem[], orderIds: string[], mode: 'remove' | 'keep'): InventoryItem[] {
  return items
    .filter((i) => {
      const need = itemNeedsOrder(i);
      return !(mode === 'remove' && need && !orderIds.includes(need));
    })
    .map((i) => {
      const need = itemNeedsOrder(i);
      if (!need) return i;
      return { ...i, accessConflict: !orderIds.includes(need) || undefined };
    });
}

// ---------- Создание ----------

export function draftToCharacter(d: CreationDraft, now = Date.now()): Character {
  const build: Build = {
    raceId: d.raceId, subraceId: d.subraceId, freeRaceBonus: getRace(d.raceId)?.freeBonus ? d.freeRaceBonus : null,
    attributeInvestments: { ...d.attributeInvestments }, skillInvestments: { ...d.skillInvestments },
    attributeAdjustments: {}, skillAdjustments: {},
  };
  return {
    ...build,
    id: d.id, // тот же id: повторное создание не порождает дубль
    schemaVersion: SCHEMA_VERSION, contentVersion: CONTENT_VERSION,
    name: d.name.trim(), portraitId: d.portraitId ?? getRace(d.raceId)?.portrait ?? 'human', notes: d.notes.trim(),
    orderIds: [...new Set(d.orderIds)],
    inventory: [starterKit(), ...d.purchases],
    startingCurrency: d.startingCurrency, currentCurrency: draftCurrency(d),
    healthCurrent: healthMax(build), moraleCurrent: moraleMax(build),
    createdAt: now, updatedAt: now, lastOpenedAt: now,
  };
}

/** Применить полную правку: пересчитать текущие ресурсы под новые максимумы */
export function applyEdit(original: Character, edited: Character, now = Date.now()): Character {
  return {
    ...edited,
    orderIds: [...new Set(edited.orderIds)],
    healthCurrent: adjustCurrent(edited.healthCurrent, healthMax(edited)),
    moraleCurrent: adjustCurrent(edited.moraleCurrent, moraleMax(edited)),
    createdAt: original.createdAt,
    updatedAt: now,
  };
}

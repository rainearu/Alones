import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { SCHEMA_VERSION } from '../domain/content';
import type { Character, CreationDraft, PlayerProfile } from '../domain/types';

interface AlonesDB extends DBSchema {
  profile: { key: string; value: PlayerProfile };
  characters: { key: string; value: Character };
  drafts: { key: string; value: CreationDraft };
}

const DB_NAME = 'alones';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AlonesDB>> | null = null;

export function db() {
  if (!dbPromise) {
    dbPromise = openDB<AlonesDB>(DB_NAME, DB_VERSION, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore('profile', { keyPath: 'id' });
          d.createObjectStore('characters', { keyPath: 'id' });
          d.createObjectStore('drafts', { keyPath: 'id' });
        }
      },
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

/** Для тестов и проверки A14: имитация отказа записи */
export const faults = { failWrites: 0 };
function guard() {
  if (faults.failWrites > 0) {
    faults.failWrites -= 1;
    throw new Error('Имитация отказа записи');
  }
}

// ---------- Миграции схемы ----------
// Каждая миграция поднимает запись с версии N на N+1. Исходная запись не удаляется при ошибке.
type Migration = (r: Record<string, unknown>) => Record<string, unknown>;
const characterMigrations: Record<number, Migration> = {
  // 1: (r) => ({ ...r, newField: default, schemaVersion: 2 }),
};

export function migrateCharacter(raw: Record<string, unknown>): Character {
  let r = { ...raw };
  let v = Number(r.schemaVersion ?? 1);
  while (v < SCHEMA_VERSION) {
    const m = characterMigrations[v];
    if (!m) throw new Error(`Нет миграции персонажа с версии ${v}`);
    r = m(r);
    v = Number(r.schemaVersion);
  }
  if (v > SCHEMA_VERSION) throw new Error(`Запись из более новой версии приложения (${v})`);
  return r as unknown as Character;
}

export interface LoadResult {
  profile: PlayerProfile | null;
  characters: Character[];
  draft: CreationDraft | null;
  /** id записей, которые не удалось мигрировать; они остаются в базе нетронутыми */
  unreadable: string[];
}

export async function loadAll(): Promise<LoadResult> {
  const d = await db();
  const tx = d.transaction(['profile', 'characters', 'drafts'], 'readonly');
  const [profile, rawChars, drafts] = await Promise.all([
    tx.objectStore('profile').get('local'),
    tx.objectStore('characters').getAll(),
    tx.objectStore('drafts').getAll(),
  ]);
  const characters: Character[] = [];
  const unreadable: string[] = [];
  for (const raw of rawChars) {
    try { characters.push(migrateCharacter(raw as unknown as Record<string, unknown>)); }
    catch { unreadable.push(raw.id); }
  }
  const draft = drafts.sort((a, b) => b.lastSavedAt - a.lastSavedAt)[0] ?? null;
  return { profile: profile ?? null, characters, draft, unreadable };
}

export async function saveProfile(p: PlayerProfile) {
  guard();
  await (await db()).put('profile', p);
}

export async function saveCharacter(c: Character) {
  guard();
  await (await db()).put('characters', c);
}

export async function deleteCharacter(id: string) {
  guard();
  await (await db()).delete('characters', id);
}

/** Один активный черновик: запись заменяет все прежние */
export async function saveDraft(dr: CreationDraft) {
  guard();
  const d = await db();
  const tx = d.transaction('drafts', 'readwrite');
  const keys = await tx.store.getAllKeys();
  await Promise.all([...keys.filter((k) => k !== dr.id).map((k) => tx.store.delete(k)), tx.store.put(dr)]);
  await tx.done;
}

export async function deleteDraft() {
  guard();
  await (await db()).clear('drafts');
}

/** Атомарно: добавить персонажа и удалить черновик. Повтор с тем же id не создаёт дубль. */
export async function commitCreation(c: Character) {
  guard();
  const d = await db();
  const tx = d.transaction(['characters', 'drafts'], 'readwrite');
  await Promise.all([tx.objectStore('characters').put(c), tx.objectStore('drafts').clear()]);
  await tx.done;
}

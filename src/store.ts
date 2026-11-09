import { create } from 'zustand';
import * as repo from './storage/db';
import { draftToCharacter, newDraft } from './domain/character';
import type { Character, CreationDraft, PlayerProfile } from './domain/types';

const DEFAULT_PROFILE: PlayerProfile = { id: 'local', displayName: 'Игрок', portraitId: 'elf', accountStatus: 'basic' };

interface SaveError {
  message: string;
  retry: () => Promise<boolean>;
}

interface State {
  ready: boolean;
  loadError: string | null;
  profile: PlayerProfile;
  characters: Character[];
  draft: CreationDraft | null;
  unreadable: string[];
  saveError: SaveError | null;

  init: () => Promise<void>;
  saveProfile: (p: PlayerProfile) => Promise<boolean>;
  startDraft: () => Promise<CreationDraft>;
  updateDraft: (fn: (d: CreationDraft) => CreationDraft) => void;
  discardDraft: () => Promise<boolean>;
  createFromDraft: () => Promise<string | null>;
  saveCharacter: (c: Character) => Promise<boolean>;
  deleteCharacter: (id: string) => Promise<boolean>;
  touchCharacter: (id: string) => void;
  dismissError: () => void;
}

const ERR = 'Не удалось сохранить. Изменения остаются на экране. Освободи место на устройстве и попробуй ещё раз.';

export const useStore = create<State>((set, get) => {
  /** Выполнить запись; при ошибке показать повтор, ввод не теряется */
  async function persist(op: () => Promise<void>, onOk?: () => void): Promise<boolean> {
    try {
      await op();
      onOk?.();
      if (get().saveError) set({ saveError: null });
      return true;
    } catch {
      set({ saveError: { message: ERR, retry: () => persist(op, onOk) } });
      return false;
    }
  }

  return {
    ready: false,
    loadError: null,
    profile: DEFAULT_PROFILE,
    characters: [],
    draft: null,
    unreadable: [],
    saveError: null,

    async init() {
      try {
        const r = await repo.loadAll();
        set({ ready: true, profile: r.profile ?? DEFAULT_PROFILE, characters: r.characters, draft: r.draft, unreadable: r.unreadable });
      } catch {
        set({ ready: true, loadError: 'Хранилище на этом устройстве недоступно. Данные не будут сохранены между запусками.' });
      }
    },

    saveProfile: (p) => persist(() => repo.saveProfile(p), () => set({ profile: p })),

    async startDraft() {
      const d = newDraft();
      set({ draft: d });
      await persist(() => repo.saveDraft(d));
      return d;
    },

    updateDraft(fn) {
      const cur = get().draft;
      if (!cur) return;
      const next = { ...fn(cur), lastSavedAt: Date.now() };
      set({ draft: next });
      void persist(() => repo.saveDraft(get().draft ?? next));
    },

    discardDraft: () => persist(() => repo.deleteDraft(), () => set({ draft: null })),

    async createFromDraft() {
      const d = get().draft;
      if (!d) return null;
      const existing = get().characters.find((c) => c.id === d.id);
      if (existing) return existing.id;
      const c = draftToCharacter(d);
      const ok = await persist(() => repo.commitCreation(c), () =>
        set((s) => ({ draft: null, characters: [...s.characters.filter((x) => x.id !== c.id), c] })));
      return ok ? c.id : null;
    },

    saveCharacter: (c) =>
      persist(() => repo.saveCharacter(c), () => set((s) => ({ characters: s.characters.map((x) => (x.id === c.id ? c : x)) }))),

    deleteCharacter: (id) =>
      persist(() => repo.deleteCharacter(id), () => set((s) => ({ characters: s.characters.filter((x) => x.id !== id) }))),

    touchCharacter(id) {
      const c = get().characters.find((x) => x.id === id);
      if (!c) return;
      const next = { ...c, lastOpenedAt: Date.now() };
      set((s) => ({ characters: s.characters.map((x) => (x.id === id ? next : x)) }));
      repo.saveCharacter(next).catch(() => {});
    },

    dismissError: () => set({ saveError: null }),
  };
});

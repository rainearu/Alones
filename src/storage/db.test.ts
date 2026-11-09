import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { commitCreation, faults, loadAll, saveCharacter, saveDraft } from './db';
import { draftToCharacter, newDraft } from '../domain/character';

describe('Хранилище', () => {
  it('A02 · черновик переживает перезапуск, хранится один активный', async () => {
    const d = { ...newDraft(), raceId: 'tii', subraceId: 'tii_kroner', attributeInvestments: { dex: 1 } };
    await saveDraft(d);
    await saveDraft({ ...newDraft(), name: 'второй' });
    await saveDraft(d);
    const r = await loadAll();
    expect(r.draft?.id).toBe(d.id);
    expect(r.draft?.attributeInvestments).toEqual({ dex: 1 });
  });

  it('создание атомарно и не создаёт дубль при повторе; A14 · отказ записи', async () => {
    const d = { ...newDraft(), raceId: 'tii', subraceId: 'tii_kroner', name: 'Рин' };
    await saveDraft(d);
    const c = draftToCharacter(d);
    faults.failWrites = 1;
    await expect(commitCreation(c)).rejects.toThrow();
    expect((await loadAll()).draft?.id).toBe(d.id);
    await commitCreation(c);
    await commitCreation(c);
    const r = await loadAll();
    expect(r.characters.filter((x) => x.id === c.id)).toHaveLength(1);
    expect(r.draft).toBeNull();
  });

  it('запись из будущей схемы не теряется и не ломает загрузку', async () => {
    const c = draftToCharacter({ ...newDraft(), raceId: 'tii', subraceId: 'tii_kroner', name: 'X' });
    await saveCharacter({ ...c, schemaVersion: 99 });
    const r = await loadAll();
    expect(r.unreadable).toContain(c.id);
  });
});

import { describe, expect, it } from 'vitest';
import example from '../data/example_character.json';
import expected from '../data/validation_example.json';
import { SKILLS, getWeapon } from './content';
import {
  attributeDecBlockers, attributeValue, canDecAttribute, canIncAttribute, canIncSkill, capViolations,
  changeAttributeInvestment, changeSkillInvestment, emptyBuild, freeBonusOptions, healthMax, mentalSP, moraleMax,
  physicalSP, pointsLeft, pointsSpent, preparationIssues, setAttributeFinal, setRace, setSkillFinal, setSubrace,
  skillCap, skillValue, weaponDamage, adjustCurrent,
} from './rules';
import { accessConflicts, applyEdit, checkNewItem, draftToCharacter, makeItem, newDraft, resolveAccess } from './character';
import type { Build, Character } from './types';

const rin: Build = {
  ...emptyBuild(),
  raceId: example.raceId, subraceId: example.subraceId,
  attributeInvestments: example.attributeInvestments, skillInvestments: example.skillInvestments,
};

describe('A20 · проверочный персонаж Рин', () => {
  it('даёт точные значения из validation_example.json', () => {
    expect(pointsSpent(rin)).toBe(expected.pointsSpent);
    for (const [a, v] of Object.entries(expected.attributes)) expect(attributeValue(rin, a as never)).toBe(v);
    for (const [s, v] of Object.entries(expected.skills)) expect(skillValue(rin, s), s).toBe(v);
    expect(healthMax(rin)).toBe(expected.healthMax);
    expect(moraleMax(rin)).toBe(expected.moraleMax);
    expect(physicalSP(rin)).toBe(expected.physicalSP);
    expect(mentalSP(rin)).toBe(expected.mentalSP);
    expect(skillValue(rin, 'blades')).toBe(5);
  });
  it('справочник содержит 40 навыков и 10 владений', () => {
    expect(SKILLS.filter((s) => s.kind === 'skill')).toHaveLength(40);
    expect(SKILLS.filter((s) => s.kind === 'proficiency')).toHaveLength(10);
  });
});

const tii = (): Build => setSubrace(setRace(emptyBuild(), 'tii'), 'tii_kroner');

describe('A03 · общий бюджет', () => {
  it('9 очков блокируют, 10 разрешают, 11 ввести нельзя', () => {
    let b = tii();
    b = changeAttributeInvestment(b, 'dex', 1); // 3
    b = changeAttributeInvestment(b, 'str', 1); // 6
    b = changeAttributeInvestment(b, 'per', 1); // 9
    expect(pointsSpent(b)).toBe(9);
    expect(preparationIssues(b, 'creation').some((i) => i.code === 'pointsLeft')).toBe(true);
    expect(canIncAttribute(b)).toBe(false);
    b = changeSkillInvestment(b, 'skill_01', 1);
    expect(pointsSpent(b)).toBe(10);
    expect(preparationIssues(b, 'creation')).toEqual([]);
    expect(canIncSkill(b, 'skill_02')).toBe(false);
    expect(changeSkillInvestment(b, 'skill_02', 1)).toBe(b);
    expect(pointsLeft(b)).toBe(0);
  });
});

describe('A04 · связь навыков', () => {
  it('+1 Ловкости стоит 3 и поднимает все навыки Ловкости', () => {
    const b0 = tii();
    const b1 = changeAttributeInvestment(b0, 'dex', 1);
    expect(pointsSpent(b1)).toBe(3);
    for (const s of SKILLS.filter((x) => x.attribute === 'dex')) expect(skillValue(b1, s.id)).toBe(skillValue(b0, s.id) + 1);
  });
});

describe('A05 · предел навыка', () => {
  it('навык не выше 2 × характеристика; снижение характеристики показывает конфликт', () => {
    let b = setSubrace(setRace(emptyBuild(), 'shsheni'), 'shsheni_two'); // Сила 3
    b = changeAttributeInvestment(b, 'str', 1); // Сила 4, предел 8
    for (let i = 0; i < 4; i++) b = changeSkillInvestment(b, 'skill_01', 1); // Атлетика 8
    expect(skillValue(b, 'skill_01')).toBe(8);
    expect(skillCap(b, 'skill_01')).toBe(8);
    expect(canIncSkill(b, 'skill_01')).toBe(false);
    expect(canDecAttribute(b, 'str')).toBe(false);
    expect(attributeDecBlockers(b, 'str')).toEqual(['Атлетика']);
  });
  it('смена расы с потерей бонуса не обнуляет вложения, а отмечает конфликт', () => {
    let b = setSubrace(setRace(emptyBuild(), 'shsheni'), 'shsheni_two'); // Сила 3, предел 6
    for (let i = 0; i < 3; i++) b = changeSkillInvestment(b, 'skill_01', 1); // 6
    b = setSubrace(setRace(b, 'tii'), 'tii_kroner'); // Сила 2, предел 4
    expect(b.skillInvestments.skill_01).toBe(3);
    expect(capViolations(b).map((v) => v.name)).toEqual(['Атлетика']);
  });
});

describe('A06 · Мелонианцы', () => {
  it('свободный +1 не в Харизму и не расходует подготовку', () => {
    let b = setSubrace(setRace(emptyBuild(), 'melonian'), 'human');
    expect(freeBonusOptions(b)).not.toContain('cha');
    b = { ...b, freeRaceBonus: 'dex' };
    expect(attributeValue(b, 'dex')).toBe(3);
    expect(attributeValue(b, 'cha')).toBe(3);
    expect(pointsSpent(b)).toBe(0);
    expect(attributeValue({ ...b, freeRaceBonus: 'cha' }, 'cha')).toBe(3);
  });
});

describe('A07 · смена подрасы', () => {
  it('пересчитывает обе СП, свойства берутся из справочника', () => {
    const b = tii();
    expect([physicalSP(b), mentalSP(b)]).toEqual([11, 8]);
    const low = setSubrace(b, 'tii_lowland');
    expect([physicalSP(low), mentalSP(low)]).toEqual([10, 9]);
  });
});

describe('A10 · покупка', () => {
  it('цена × количество; недостаток средств блокирует; полученный бесплатен', () => {
    expect(checkNewItem({ catalogId: 'dagger', customItem: null, quantity: 3, acquisitionType: 'purchased', price: 5 }, 30))
      .toEqual({ ok: true, cost: 15 });
    expect(checkNewItem({ catalogId: 'dagger', customItem: null, quantity: 7, acquisitionType: 'purchased', price: 5 }, 30).ok).toBe(false);
    expect(checkNewItem({ catalogId: 'dagger', customItem: null, quantity: 1, acquisitionType: 'received', price: null }, 0))
      .toEqual({ ok: true, cost: 0 });
    expect(checkNewItem({ catalogId: 'dagger', customItem: null, quantity: 0, acquisitionType: 'received', price: null }, 0).ok).toBe(false);
    const d = newDraft();
    d.purchases = [makeItem({ catalogId: 'dagger', customItem: null, quantity: 3, acquisitionType: 'purchased', price: 5 })];
    d.raceId = 'tii'; d.subraceId = 'tii_kroner'; d.name = 'Тест';
    expect(draftToCharacter(d).currentCurrency).toBe(15);
  });
});

describe('A11 · ресурсы', () => {
  it('Сила 2→3: максимум 50→60, текущее 30 сохраняется; Дух 2→3: 4→5', () => {
    const c: Character = { ...draftToCharacter({ ...newDraft(), ...rin, name: 'Рин' }), healthCurrent: 30 };
    const edited = setAttributeFinal(setAttributeFinal(c, 'str', 3), 'spi', 3) as Character;
    const saved = applyEdit(c, edited);
    expect(healthMax(c)).toBe(50);
    expect(healthMax(saved)).toBe(60);
    expect(saved.healthCurrent).toBe(30);
    expect(moraleMax(saved)).toBe(5);
    expect(adjustCurrent(55, 40)).toBe(40);
  });
});

describe('Правки после создания', () => {
  it('итоги выводятся из базы и вложений, предел остаётся проверкой', () => {
    let b = setAttributeFinal(rin, 'dex', 5);
    expect(b.attributeInvestments.dex).toBe(1);
    expect(skillValue(b, 'skill_06')).toBe(7);
    b = setSkillFinal(b, 'skill_06', 11);
    expect(preparationIssues(b, 'edit').some((i) => i.code === 'cap')).toBe(true);
    b = setAttributeFinal(b, 'per', 0);
    expect(preparationIssues(b, 'edit').some((i) => i.code === 'attrMin')).toBe(true);
    expect(preparationIssues(rin, 'edit')).toEqual([]);
  });
});

describe('A16 · оружие', () => {
  it('только к6; меч 3к6/7 ОД; урон = кубы + владение + Сила; Соулер без двойного Духа', () => {
    const sword = getWeapon('longsword')!;
    expect([sword.diceCount, sword.diceSides, sword.actionCost]).toEqual([3, 6, 7]);
    const hammer = getWeapon('warhammer')!;
    expect([hammer.diceCount, hammer.actionCost]).toEqual([4, 9]);
    expect(weaponDamage(rin, sword).label).toBe('3к6 + 5 + 2');
    expect(weaponDamage(rin, getWeapon('souler')!).label).toBe('2к6 + 2');
  });
});

describe('A17 · Соулер и Тень', () => {
  it('снятие Тени даёт конфликт, предмет не исчезает молча', () => {
    const s = makeItem({ catalogId: 'souler', customItem: null, quantity: 1, acquisitionType: 'received', price: null, masterApproved: true });
    expect(accessConflicts([s], ['shadow'])).toHaveLength(0);
    expect(accessConflicts([s], [])).toHaveLength(1);
    expect(resolveAccess([s], [], 'remove')).toHaveLength(0);
    expect(resolveAccess([s], [], 'keep')[0].accessConflict).toBe(true);
    expect(resolveAccess(resolveAccess([s], [], 'keep'), ['shadow'], 'keep')[0].accessConflict).toBeUndefined();
  });
});

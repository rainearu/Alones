import { ATTRIBUTES, RULES, SKILLS, getRace, getSkill, getSubrace } from './content';
import { ATTRS, type AttrId, type Build, type Weapon } from './types';

const sum = (o: Record<string, number | undefined>) => Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);
const n = (v: number | undefined) => v ?? 0;

export const POINTS = RULES.preparationPoints; // 10
export const ATTR_COST = RULES.attributePointCost; // 3
export const SKILL_COST = RULES.skillPointCost; // 1
export const MIN_ATTRIBUTE_IN_EDIT = 1;

export function emptyBuild(): Build {
  return {
    raceId: null, subraceId: null, freeRaceBonus: null,
    attributeInvestments: {}, skillInvestments: {}, attributeAdjustments: {}, skillAdjustments: {},
  };
}

/** Расовый бонус характеристики, включая свободный бонус Мелонианцев */
export function raceBonus(b: Build, a: AttrId): number {
  const race = getRace(b.raceId);
  if (!race) return 0;
  let v = n(race.bonuses[a]);
  if (race.freeBonus && b.freeRaceBonus === a && !race.freeBonus.exclude.includes(a)) v += 1;
  return v;
}

/** Значение характеристики без правок после создания */
export function attributeBeforeAdjust(b: Build, a: AttrId): number {
  return RULES.baseAttribute + raceBonus(b, a) + n(b.attributeInvestments[a]);
}

export function attributeValue(b: Build, a: AttrId): number {
  return attributeBeforeAdjust(b, a) + n(b.attributeAdjustments[a]);
}

export function attributes(b: Build): Record<AttrId, number> {
  return Object.fromEntries(ATTRS.map((a) => [a, attributeValue(b, a)])) as Record<AttrId, number>;
}

/** Собственное вложение в навык сверх характеристики (подготовка + правки) */
export function skillOwn(b: Build, skillId: string): number {
  return n(b.skillInvestments[skillId]) + n(b.skillAdjustments[skillId]);
}

export function skillValue(b: Build, skillId: string): number {
  const s = getSkill(skillId);
  if (!s) return 0;
  return attributeValue(b, s.attribute) + skillOwn(b, skillId);
}

export function skillCap(b: Build, skillId: string): number {
  const s = getSkill(skillId)!;
  return RULES.skillCapMultiplier * attributeValue(b, s.attribute);
}

export function pointsSpent(b: Build): number {
  return ATTR_COST * sum(b.attributeInvestments) + SKILL_COST * sum(b.skillInvestments);
}

export const pointsLeft = (b: Build) => POINTS - pointsSpent(b);

export const healthMax = (b: Build) => 30 + 10 * attributeValue(b, 'str');
export const moraleMax = (b: Build) => 2 + attributeValue(b, 'spi');

export function physicalSP(b: Build): number | null {
  const s = getSubrace(b.subraceId);
  return s ? s.physicalBase + attributeValue(b, 'dex') : null;
}
export function mentalSP(b: Build): number | null {
  const s = getSubrace(b.subraceId);
  return s ? s.mentalBase + attributeValue(b, 'spi') : null;
}

/** Навыки, превышающие предел 2 × характеристика */
export function capViolations(b: Build) {
  return SKILLS.filter((s) => skillValue(b, s.id) > skillCap(b, s.id)).map((s) => ({
    skillId: s.id, name: s.name, value: skillValue(b, s.id), cap: skillCap(b, s.id),
  }));
}

// ---------- Подготовка (создание) ----------

export function canIncAttribute(b: Build): boolean {
  return pointsLeft(b) >= ATTR_COST;
}

/** Навыки, которые помешают снизить вложение в характеристику */
export function attributeDecBlockers(b: Build, a: AttrId) {
  const nextCap = RULES.skillCapMultiplier * (attributeValue(b, a) - 1);
  return SKILLS.filter((s) => s.attribute === a && skillValue(b, s.id) - 1 > nextCap).map((s) => s.name);
}

export function canDecAttribute(b: Build, a: AttrId): boolean {
  return n(b.attributeInvestments[a]) > 0 && attributeDecBlockers(b, a).length === 0;
}

export function canIncSkill(b: Build, skillId: string): boolean {
  return pointsLeft(b) >= SKILL_COST && skillValue(b, skillId) + 1 <= skillCap(b, skillId);
}

export const canDecSkill = (b: Build, skillId: string) => n(b.skillInvestments[skillId]) > 0;

export function changeAttributeInvestment(b: Build, a: AttrId, delta: 1 | -1): Build {
  if (delta > 0 && !canIncAttribute(b)) return b;
  if (delta < 0 && !canDecAttribute(b, a)) return b;
  const v = n(b.attributeInvestments[a]) + delta;
  const next = { ...b.attributeInvestments, [a]: v };
  if (v === 0) delete next[a];
  return { ...b, attributeInvestments: next };
}

export function changeSkillInvestment(b: Build, skillId: string, delta: 1 | -1): Build {
  if (delta > 0 && !canIncSkill(b, skillId)) return b;
  if (delta < 0 && !canDecSkill(b, skillId)) return b;
  const v = n(b.skillInvestments[skillId]) + delta;
  const next = { ...b.skillInvestments, [skillId]: v };
  if (v === 0) delete next[skillId];
  return { ...b, skillInvestments: next };
}

/** Смена расы: вложения сохраняются, свободный бонус сбрасывается, если раса другая */
export function setRace(b: Build, raceId: string): Build {
  if (b.raceId === raceId) return b;
  const race = getRace(raceId);
  const subraceId = race?.subraces.includes(b.subraceId ?? '') ? b.subraceId : null;
  return { ...b, raceId, subraceId, freeRaceBonus: race?.freeBonus ? b.freeRaceBonus : null };
}

export function setSubrace(b: Build, subraceId: string): Build {
  return { ...b, subraceId };
}

export function needsFreeBonus(b: Build): boolean {
  return !!getRace(b.raceId)?.freeBonus;
}

export function freeBonusOptions(b: Build): AttrId[] {
  const race = getRace(b.raceId);
  if (!race?.freeBonus) return [];
  return ATTRS.filter((a) => !race.freeBonus!.exclude.includes(a));
}

export type BuildIssue =
  | { code: 'race' | 'subrace' | 'freeBonus' | 'pointsLeft' | 'pointsOver' }
  | { code: 'cap'; name: string; value: number; cap: number }
  | { code: 'attrMin'; name: string }
  | { code: 'skillMin'; name: string };

export function originIssues(b: Build): BuildIssue[] {
  const out: BuildIssue[] = [];
  const race = getRace(b.raceId);
  if (!race) out.push({ code: 'race' });
  const sub = getSubrace(b.subraceId);
  if (!sub || sub.raceId !== b.raceId) out.push({ code: 'subrace' });
  if (race?.freeBonus && (!b.freeRaceBonus || race.freeBonus.exclude.includes(b.freeRaceBonus)))
    out.push({ code: 'freeBonus' });
  return out;
}

export function preparationIssues(b: Build, mode: 'creation' | 'edit'): BuildIssue[] {
  const out: BuildIssue[] = [];
  if (mode === 'creation') {
    const left = pointsLeft(b);
    if (left > 0) out.push({ code: 'pointsLeft' });
    if (left < 0) out.push({ code: 'pointsOver' });
  } else {
    for (const a of ATTRIBUTES) if (attributeValue(b, a.id) < MIN_ATTRIBUTE_IN_EDIT) out.push({ code: 'attrMin', name: a.name });
    for (const s of SKILLS) if (skillOwn(b, s.id) < 0) out.push({ code: 'skillMin', name: s.name });
  }
  for (const v of capViolations(b)) out.push({ code: 'cap', ...v });
  return out;
}

export function issueText(i: BuildIssue): string {
  switch (i.code) {
    case 'race': return 'Выбери расу.';
    case 'subrace': return 'Выбери подрасу этой расы.';
    case 'freeBonus': return 'Выбери свободный бонус Мелонианцев.';
    case 'pointsLeft': return 'Распредели все 10 очков подготовки.';
    case 'pointsOver': return 'Потрачено больше 10 очков — сними лишние вложения.';
    case 'cap': return `${i.name}: ${i.value} выше предела ${i.cap}. Снизь навык или подними характеристику.`;
    case 'attrMin': return `${i.name} не может быть ниже ${MIN_ATTRIBUTE_IN_EDIT}.`;
    case 'skillMin': return `${i.name} не может быть ниже связанной характеристики.`;
  }
}

// ---------- Полное редактирование ----------

/** Задать итоговое значение характеристики через правку, не трогая вложения подготовки */
export function setAttributeFinal(b: Build, a: AttrId, value: number): Build {
  const adj = value - attributeBeforeAdjust(b, a);
  const next = { ...b.attributeAdjustments, [a]: adj };
  if (adj === 0) delete next[a];
  return { ...b, attributeAdjustments: next };
}

export function setSkillFinal(b: Build, skillId: string, value: number): Build {
  const s = getSkill(skillId)!;
  const adj = value - attributeValue(b, s.attribute) - n(b.skillInvestments[skillId]);
  const next = { ...b.skillAdjustments, [skillId]: adj };
  if (adj === 0) delete next[skillId];
  return { ...b, skillAdjustments: next };
}

// ---------- Ресурсы ----------

/** Рост максимума сохраняет текущее значение, снижение — ограничивает его */
export function adjustCurrent(current: number, newMax: number): number {
  return Math.max(0, Math.min(current, newMax));
}

export const clampResource = (v: number, max: number) => Math.max(0, Math.min(Math.round(v), max));

// ---------- Оружие ----------

export function weaponDamage(b: Build, w: Weapon) {
  const prof = skillValue(b, w.proficiency);
  const attr = w.damageAttribute ? attributeValue(b, w.damageAttribute) : null;
  const dice = `${w.diceCount}к${w.diceSides}`;
  const parts = [dice, String(prof)];
  if (attr !== null) parts.push(String(attr));
  return { dice, proficiency: prof, attribute: attr, flat: prof + (attr ?? 0), label: parts.join(' + ') };
}

import attributesJson from '../data/attributes.json';
import racesJson from '../data/races.json';
import subracesJson from '../data/subraces.json';
import skillsJson from '../data/skills.json';
import weaponsJson from '../data/weapons.json';
import ordersJson from '../data/orders.json';
import rulesJson from '../data/rules.json';
import futureJson from '../data/future_categories.json';
import articlesJson from '../data/articles.json';
import type { Article, AttrId, Order, Race, Skill, Subrace, Weapon } from './types';

export const RULES = rulesJson;
export const CONTENT_VERSION: string = rulesJson.contentVersion;
export const SCHEMA_VERSION = 1;

export const ATTRIBUTES = attributesJson as { id: AttrId; name: string; description: string; base: number }[];
export const RACES = racesJson as Race[];
export const SUBRACES = subracesJson as unknown as Subrace[];
export const SKILLS = skillsJson as Skill[];
export const WEAPONS = weaponsJson as Weapon[];
export const ORDERS = ordersJson as Order[];
export const FUTURE_CATEGORIES = futureJson as { id: string; name: string; implemented: boolean; abilities: unknown[] }[];
export const ARTICLES = articlesJson as { contentVersion: string; lore: Article[]; rulebook: Article[] };

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const raceMap = byId(RACES);
const subMap = byId(SUBRACES);
const skillMap = byId(SKILLS);
const weaponMap = byId(WEAPONS);
const orderMap = byId(ORDERS);

export const getRace = (id: string | null | undefined) => (id ? raceMap.get(id) : undefined);
export const getSubrace = (id: string | null | undefined) => (id ? subMap.get(id) : undefined);
export const getSkill = (id: string) => skillMap.get(id);
export const getWeapon = (id: string | null | undefined) => (id ? weaponMap.get(id) : undefined);
export const getOrder = (id: string) => orderMap.get(id);
export const attrName = (id: AttrId) => ATTRIBUTES.find((a) => a.id === id)!.name;

/** Родительный падеж для коротких подписей */
export const ATTR_SHORT: Record<AttrId, string> = {
  str: 'Сила', dex: 'Ловкость', per: 'Восприятие', int: 'Интеллект', cha: 'Харизма', spi: 'Дух',
};

export const PORTRAITS = SUBRACES.map((s) => ({ id: s.portrait, label: `${getRace(s.raceId)!.name} · ${s.name}` }));

export const img = {
  portrait: (id: string) => `${import.meta.env.BASE_URL}img/portraits/${id}.webp`,
  weapon: (id: string) => `${import.meta.env.BASE_URL}img/weapons/${id}.webp`,
  order: (id: string) => `${import.meta.env.BASE_URL}img/orders/${id}.webp`,
  group: (id: AttrId) => `${import.meta.env.BASE_URL}img/groups/${id}.webp`,
  icon: (name: string) => `${import.meta.env.BASE_URL}img/${name}.svg`,
};

/** «Тии · Кронер» */
export function originLabel(raceId: string | null, subraceId: string | null) {
  const r = getRace(raceId);
  const s = getSubrace(subraceId);
  return [r?.singular, s?.singular].filter(Boolean).join(' · ');
}

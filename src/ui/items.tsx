import { useState } from 'react';
import { ATTR_SHORT, ORDERS, WEAPONS, getSkill, getWeapon, img } from '../domain/content';
import { checkNewItem, itemName, type NewItemInput } from '../domain/character';
import { weaponDamage } from '../domain/rules';
import type { Build, InventoryItem, Weapon } from '../domain/types';
import { Art, Check, Chips, Field, Icon, Notice, parseNonNeg } from './kit';

export const GEAR_NOTICE = 'Доступность снаряжения уточни у своего мастера.';
export const ORDER_NOTICE = 'Доступность ордена уточни у своего мастера.';

export function weaponRule(w: Weapon) {
  const prof = getSkill(w.proficiency)!;
  const parts = ['кубы оружия', 'владение'];
  if (w.damageAttribute) parts.push(ATTR_SHORT[w.damageAttribute]);
  return `${prof.name} оружие. Урон: ${parts.join(' + ')}.`;
}

export function WeaponCatalog({ onOpen, sheetMode, orderIds }: { onOpen: (id: string) => void; sheetMode: boolean; orderIds: string[] }) {
  return (
    <>
      {WEAPONS.map((w) => {
        const locked = !!w.accessOrder && (!sheetMode || !orderIds.includes(w.accessOrder));
        return (
          <button key={w.id} type="button" className="card row" onClick={() => onOpen(w.id)} aria-label={`${w.name}, подробнее`}>
            <Art src={img.weapon(w.id)} className="thumb" />
            <span className="grow">
              <span className="h3" style={{ display: 'block', fontWeight: 700 }}>{w.name}</span>
              <span className="xs">{w.diceCount}к{w.diceSides} · {w.actionCost} ОД</span>
              {w.accessOrder ? <span className={'xs ' + (locked ? 'muted' : 'green')} style={{ display: 'block' }}>Тени · с разрешения мастера</span> : null}
            </span>
            <span className="link" aria-hidden="true">Подробнее</span>
          </button>
        );
      })}
    </>
  );
}

/** Форма добавления: способ получения, цена, количество */
export function AcquireForm({ funds, onSubmit, catalogId, custom, submitLabel = 'Добавить предмет', extraOk = true, extraBlock }: {
  funds: number; onSubmit: (input: NewItemInput) => void; catalogId: string | null; custom?: boolean;
  submitLabel?: string; extraOk?: boolean; extraBlock?: React.ReactNode;
}) {
  const [mode, setMode] = useState<'purchased' | 'received'>(custom ? 'received' : 'purchased');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tried, setTried] = useState(false);

  const input: NewItemInput = {
    catalogId, customItem: custom ? { name, description: desc } : null,
    quantity: parseNonNeg(qty) ?? 0, acquisitionType: mode,
    price: mode === 'purchased' ? parseNonNeg(price) : null,
  };
  const check = checkNewItem(input, funds);

  return (
    <form onSubmit={(e) => { e.preventDefault(); setTried(true); if (check.ok && extraOk) onSubmit(input); }}>
      {custom ? (
        <Field label="Название *" value={name} onChange={setName} maxLength={60} placeholder="Например, плащ путника"
          error={tried && !name.trim() ? 'Укажи название.' : null} />
      ) : null}
      <Field label="Количество" value={qty} onChange={setQty} inputMode="numeric" maxLength={4}
        error={tried && !(Number(qty) >= 1 && /^\d+$/.test(qty)) ? 'Целое число от 1.' : null} />
      {custom ? <Field label="Описание" value={desc} onChange={setDesc} maxLength={300} multiline placeholder="Необязательно" /> : null}
      <Chips label="Способ получения" value={mode} onChange={setMode}
        options={custom ? [{ id: 'received', label: 'Получен' }, { id: 'purchased', label: 'Куплен' }] : [{ id: 'purchased', label: 'Куплен' }, { id: 'received', label: 'Получен' }]} />
      {mode === 'purchased' ? (
        <Field label="Цена за единицу по договорённости с мастером" value={price} onChange={setPrice} inputMode="numeric"
          placeholder="Укажи цену в Пи" maxLength={7} help={`Доступно: ${funds} Пи`}
          error={tried && input.price === null ? 'Укажи цену — неотрицательное целое число.' : null} />
      ) : null}
      <Notice>{mode === 'purchased' ? 'Покупка будет списана из текущих средств. Предмет можно также добавить как полученный.' : 'Для полученного предмета средства не списываются.'}</Notice>
      {extraBlock}
      {tried && !check.ok ? <p className="small error-text" role="alert">{check.reason}</p> : null}
      <button className="btn" type="submit" disabled={!extraOk}>{submitLabel}</button>
    </form>
  );
}

export function WeaponInfo({ w, build }: { w: Weapon; build: Build | null }) {
  return (
    <>
      <Art src={img.weapon(w.id)} className="hero-img" />
      <div className="card">
        <div className="row between"><span className="muted">Урон оружия</span><b>{w.diceCount}к{w.diceSides}</b></div>
        <div className="divider" />
        <div className="row between"><span className="muted">Стоимость атаки</span><b>{w.actionCost} ОД</b></div>
        <div className="divider" />
        <div className="row between"><span className="muted">Область</span><b style={{ textAlign: 'right' }}>{w.area}</b></div>
        {build ? <><div className="divider" /><div className="row between"><span className="muted">Урон персонажа</span><b>{weaponDamage(build, w).label}</b></div></> : null}
      </div>
      <p className="p">{weaponRule(w)} Превышение СП определяет попадание и крит, но к урону не прибавляется.</p>
    </>
  );
}

export function InventoryRow({ item, build, onOpen, onRemove }: { item: InventoryItem; build: Build; onOpen?: () => void; onRemove?: () => void }) {
  const w = getWeapon(item.catalogId);
  const body = (
    <>
      {w ? <Art src={img.weapon(w.id)} className="thumb sm" /> : <span className="thumb sm" style={{ display: 'grid', placeItems: 'center' }}>{Icon.item}</span>}
      <span className="grow">
        <b className="clamp2" style={{ display: 'block' }}>{itemName(item)}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</b>
        {w ? <span className="xs" style={{ display: 'block' }}>Урон {weaponDamage(build, w).label} · {w.actionCost} ОД</span> : null}
        {item.customItem?.description ? <span className="xs clamp2" style={{ display: 'block' }}>{item.customItem.description}</span> : null}
        <span className="xs" style={{ display: 'block' }}>
          {item.acquisitionType === 'purchased' ? `Куплен · ${item.purchasePrice} Пи${item.quantity > 1 ? ' за шт.' : ''}` : item.acquisitionType === 'received' ? 'Получен' : 'Стартовый, без списания'}
        </span>
        {item.accessConflict ? <span className="badge danger" style={{ marginTop: 4 }}>Недоступен без Тени</span> : null}
      </span>
    </>
  );
  return (
    <div className={'card row' + (item.accessConflict ? ' conflict' : '')} style={{ padding: 12 }}>
      {onOpen ? <button type="button" className="row grow" style={{ textAlign: 'left' }} onClick={onOpen}>{body}</button> : <div className="row grow">{body}</div>}
      {onRemove ? <button type="button" className="iconbtn" aria-label={`Удалить ${itemName(item)}`} onClick={onRemove}>{Icon.close}</button> : null}
    </div>
  );
}

export function OrderPicker({ selected, onToggle, onOpen }: { selected: string[]; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <>
      {ORDERS.map((o) => {
        const on = selected.includes(o.id);
        return (
          <div key={o.id} className={'card row' + (on ? ' selected' : '')} style={{ padding: 12 }}>
            <Art src={img.order(o.id)} className="thumb" />
            <div className="grow">
              <b>{o.name}</b>
              <div><button type="button" className="link" style={{ minHeight: 32 }} onClick={() => onOpen(o.id)}>Об ордене</button></div>
            </div>
            <button type="button" role="checkbox" aria-checked={on} aria-label={`Орден ${o.name}`} className="iconbtn" onClick={() => onToggle(o.id)}><Check on={on} /></button>
          </div>
        );
      })}
    </>
  );
}

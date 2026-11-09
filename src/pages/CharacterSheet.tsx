import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ATTRIBUTES, ATTR_SHORT, FUTURE_CATEGORIES, SKILLS, getOrder, getRace, getSubrace, getWeapon, img, originLabel } from '../domain/content';
import { accessConflicts, checkNewItem, itemName, makeItem, resolveAccess } from '../domain/character';
import { attributeValue, clampResource, healthMax, mentalSP, moraleMax, physicalSP, skillCap, skillValue } from '../domain/rules';
import type { Character, InventoryItem } from '../domain/types';
import { useStore } from '../store';
import { Art, Chips, Field, Notice, Portrait, Screen, Sheet, Stepper, parseNonNeg } from '../ui/kit';
import { AcquireForm, GEAR_NOTICE, InventoryRow, ORDER_NOTICE, OrderPicker, WeaponCatalog, WeaponInfo } from '../ui/items';
import { TraitsBlock } from '../ui/origin';
import { OrderInfo } from './Create';

type Tab = 'sheet' | 'skills' | 'items';

function useCharacter() {
  const { id = '' } = useParams();
  const c = useStore((s) => s.characters.find((x) => x.id === id));
  const ready = useStore((s) => s.ready);
  return { id, c, ready };
}

function Hero({ c, tab, onTab }: { c: Character; tab: Tab | null; onTab: (t: Tab) => void }) {
  return (
    <>
      <div className="hero">
        <Portrait id={c.portraitId} className="thumb round" />
        <div className="grow">
          <div className="eyebrow">{originLabel(c.raceId, c.subraceId)}</div>
          <h2 className="title" style={{ overflowWrap: 'anywhere' }}>{c.name}</h2>
        </div>
      </div>
      <Chips<Tab> label="Разделы листа" value={tab ?? ('' as Tab)} onChange={onTab}
        options={[{ id: 'sheet', label: 'Лист' }, { id: 'skills', label: 'Навыки' }, { id: 'items', label: 'Вещи' }]} />
    </>
  );
}

export function CharacterSheet() {
  const { id, c, ready } = useCharacter();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const touch = useStore((s) => s.touchCharacter);
  const [res, setRes] = useState<'health' | 'morale' | null>(null);
  const [money, setMoney] = useState(false);
  const [itemSheet, setItemSheet] = useState<InventoryItem | null>(null);
  const tab = (params.get('tab') as Tab) || 'sheet';

  useEffect(() => { if (c) touch(c.id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  if (!c) return <Navigate to="/" replace />;

  const hMax = healthMax(c), mMax = moraleMax(c);
  const sub = getSubrace(c.subraceId);
  const setTab = (t: Tab) => setParams(t === 'sheet' ? {} : { tab: t }, { replace: true });

  const footer = <button className="btn" onClick={() => nav(`/c/${c.id}/edit`)}>Редактировать персонажа</button>;
  const overlays = (
    <>
      {res ? <ResourceSheet c={c} kind={res} onClose={() => setRes(null)} /> : null}
      {money ? <MoneySheet c={c} onClose={() => setMoney(false)} /> : null}
      {itemSheet ? <ItemSheet c={c} item={itemSheet} onClose={() => setItemSheet(null)} /> : null}
    </>
  );

  return (
    <Screen title={tab === 'skills' ? 'Характеристики и навыки' : tab === 'items' ? 'Снаряжение' : 'Лист персонажа'}
      left={{ icon: 'back', label: 'К персонажам', onClick: () => nav('/') }} footer={footer} overlayChildren={overlays} key={tab}>
      <Hero c={c} tab={tab} onTab={setTab} />

      {tab === 'sheet' ? (
        <>
          <div className="grid2">
            <ResourceCard label="Здоровье" value={c.healthCurrent} max={hMax} color="var(--health)" onClick={() => setRes('health')} />
            <ResourceCard label="Мораль" value={c.moraleCurrent} max={mMax} color="var(--morale)" onClick={() => setRes('morale')} />
          </div>
          {c.healthCurrent === 0 ? <div className="card status-card"><h3 className="h3">Персонаж погиб</h3><span className="xs">Здоровье: 0</span></div> : null}
          {c.moraleCurrent === 0 ? <div className="card status-card"><h3 className="h3">Сломлен</h3><span className="xs">Мораль: 0</span></div> : null}
          {c.healthCurrent === 0 || c.moraleCurrent === 0 ? <p className="small muted">Лист сохранён. Текущие значения можно изменить по решению мастера.</p> : null}
          <div className="card">
            <div className="row between"><span>Физическая СП</span><b>{physicalSP(c)}</b></div>
            <div className="xs">База {sub?.physicalBase} + Ловкость {attributeValue(c, 'dex')}</div>
            {sub?.conditionalNotes.map((n) => <div key={n} className="xs green">Условие: {n}</div>)}
            <div className="divider" />
            <div className="row between"><span>Ментальная СП</span><b>{mentalSP(c)}</b></div>
            <div className="xs">База {sub?.mentalBase} + Дух {attributeValue(c, 'spi')}</div>
          </div>
          <h2 className="h2">Персонаж</h2>
          {[
            ['Характеристики и навыки', () => setTab('skills')],
            [`Снаряжение · ${c.currentCurrency} Пи`, () => setTab('items')],
            [`Ордена · ${c.orderIds.length}`, () => nav(`/c/${c.id}/orders`)],
            ['Врождённые свойства', () => nav(`/c/${c.id}/traits`)],
            ['Категории техник', () => nav(`/c/${c.id}/techniques`)],
          ].map(([label, fn]) => (
            <button key={label as string} className="sectionrow" onClick={fn as () => void}>{label as string}<span className="chev" aria-hidden="true">›</span></button>
          ))}
          {c.notes ? <><h2 className="h2">История</h2><p className="p">{c.notes}</p></> : null}
        </>
      ) : null}

      {tab === 'skills' ? (
        <>
          <h2 className="h2 mt0">Характеристики</h2>
          {ATTRIBUTES.map((a) => (
            <div className="ctl" key={a.id}>
              <Art src={img.group(a.id)} className="thumb xs" />
              <div className="label"><b>{a.name}</b><div className="statdesc">{a.description}</div></div>
              <span className="value">{attributeValue(c, a.id)}</span>
            </div>
          ))}
          {(['skill', 'proficiency'] as const).map((kind) => (
            <div key={kind}>
              <h2 className="h2">{kind === 'skill' ? 'Навыки' : 'Владение оружием'}</h2>
              {SKILLS.filter((s) => s.kind === kind).map((s) => {
                const v = skillValue(c, s.id), cap = skillCap(c, s.id);
                return (
                  <div className="ctl" key={s.id}>
                    <div className="label"><b>{s.name}</b><div className="xs">{ATTR_SHORT[s.attribute]} {attributeValue(c, s.attribute)} · предел {cap}</div></div>
                    <span className={'value' + (v > cap ? ' bad' : '')}>{v}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      ) : null}

      {tab === 'items' ? (
        <>
          <button className="card row between" onClick={() => setMoney(true)} aria-label={`Средства ${c.currentCurrency} Пи, изменить`}>
            <span>Средства</span><span className="row"><b>{c.currentCurrency} Пи</b><span className="link" aria-hidden="true">Изменить</span></span>
          </button>
          <h2 className="h2">Инвентарь</h2>
          <Notice>Базовая одежда, обувь и браслет уже у персонажа. Добавляй покупки, находки и предметы, полученные от мастера.</Notice>
          {c.inventory.filter((i) => i.acquisitionType !== 'starting').length === 0 ? <p className="p">Нет добавленных предметов.</p> : null}
          {c.inventory.map((it) => (
            <InventoryRow key={it.instanceId} item={it} build={c} onOpen={it.acquisitionType === 'starting' ? undefined : () => setItemSheet(it)} />
          ))}
          <div className="spacer" />
          <button className="btn" onClick={() => nav(`/c/${c.id}/add`)}>Добавить предмет</button>
        </>
      ) : null}
    </Screen>
  );
}

function ResourceCard({ label, value, max, color, onClick }: { label: string; value: number; max: number; color: string; onClick: () => void }) {
  return (
    <button className="card res" onClick={onClick} aria-label={`${label}: ${value} из ${max}. Изменить`}>
      <div className="xs">{label}</div>
      <div><span className="big">{value}</span><span className="muted"> / {max}</span></div>
      <div className="bar"><i style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} /></div>
    </button>
  );
}

function ResourceSheet({ c, kind, onClose }: { c: Character; kind: 'health' | 'morale'; onClose: () => void }) {
  const save = useStore((s) => s.saveCharacter);
  const max = kind === 'health' ? healthMax(c) : moraleMax(c);
  const [v, setV] = useState(String(kind === 'health' ? c.healthCurrent : c.moraleCurrent));
  const [busy, setBusy] = useState(false);
  const num = parseNonNeg(v);
  const valid = num !== null && num <= max;
  const label = kind === 'health' ? 'Здоровье' : 'Мораль';
  const step = (d: number) => setV(String(clampResource((num ?? 0) + d, max)));
  return (
    <Sheet title={label} onClose={onClose}>
      <p className="lead">Текущее значение · максимум {max}</p>
      <Stepper big label={label} value={num ?? 0} canDec={(num ?? 0) > 0} canInc={(num ?? 0) < max} onDec={() => step(-1)} onInc={() => step(1)} />
      <Field label="Ввести значение" value={v} onChange={setV} inputMode="numeric" maxLength={4}
        error={!valid ? `Целое число от 0 до ${max}.` : null} help={`Доступно от 0 до ${max}`} />
      <button className="btn" disabled={!valid || busy} onClick={async () => {
        setBusy(true);
        const ok = await save({ ...c, [kind === 'health' ? 'healthCurrent' : 'moraleCurrent']: num!, updatedAt: Date.now() });
        setBusy(false);
        if (ok) onClose();
      }}>Сохранить</button>
    </Sheet>
  );
}

function MoneySheet({ c, onClose }: { c: Character; onClose: () => void }) {
  const save = useStore((s) => s.saveCharacter);
  const [v, setV] = useState(String(c.currentCurrency));
  const num = parseNonNeg(v);
  return (
    <Sheet title="Средства" onClose={onClose}>
      <p className="lead">Укажи текущую сумму. Продажи и возвраты не рассчитываются автоматически.</p>
      <Field label="Пи" value={v} onChange={setV} inputMode="numeric" maxLength={7} error={num === null ? 'Неотрицательное целое число.' : null} />
      <button className="btn" disabled={num === null} onClick={async () => { if (await save({ ...c, currentCurrency: num!, updatedAt: Date.now() })) onClose(); }}>Сохранить</button>
    </Sheet>
  );
}

function ItemSheet({ c, item, onClose }: { c: Character; item: InventoryItem; onClose: () => void }) {
  const save = useStore((s) => s.saveCharacter);
  const [qty, setQty] = useState(item.quantity);
  const [confirm, setConfirm] = useState(false);
  const update = (inv: InventoryItem[]) => save({ ...c, inventory: inv, updatedAt: Date.now() });
  return (
    <Sheet title={itemName(item)} onClose={onClose}>
      {item.customItem?.description ? <p className="lead">{item.customItem.description}</p> : null}
      {item.accessConflict ? <Notice warn>Соулер недоступен: у персонажа нет ордена Тень.</Notice> : null}
      {confirm ? (
        <>
          <p className="lead">Средства за удалённый предмет не возвращаются автоматически. При необходимости измени их отдельно.</p>
          <button className="btn danger" onClick={async () => { if (await update(c.inventory.filter((i) => i.instanceId !== item.instanceId))) onClose(); }}>Удалить предмет</button>
          <button className="btn secondary" onClick={() => setConfirm(false)}>Отмена</button>
        </>
      ) : (
        <>
          <div className="row between"><span>Количество</span>
            <Stepper label="Количество" value={qty} canDec={qty > 1} canInc={qty < 9999} onDec={() => setQty(qty - 1)} onInc={() => setQty(qty + 1)} />
          </div>
          <p className="xs">Изменение количества не моделирует покупку или продажу.</p>
          <button className="btn" disabled={qty === item.quantity} onClick={async () => {
            if (await update(c.inventory.map((i) => (i.instanceId === item.instanceId ? { ...i, quantity: qty } : i)))) onClose();
          }}>Сохранить</button>
          <button className="btn danger" onClick={() => setConfirm(true)}>Удалить</button>
        </>
      )}
    </Sheet>
  );
}

// ---------- Ордена ----------
export function SheetOrders() {
  const { c, ready } = useCharacter();
  const nav = useNavigate();
  if (!ready) return null;
  if (!c) return <Navigate to="/" replace />;
  return (
    <Screen title="Ордена" left="back" footer={<button className="btn" onClick={() => nav(`/c/${c.id}`)}>К листу</button>}>
      <Hero c={c} tab={null} onTab={(t) => nav(`/c/${c.id}${t === 'sheet' ? '' : '?tab=' + t}`)} />
      <h2 className="h2 mt0">Ордена</h2>
      {c.orderIds.length === 0 ? <p className="p">Персонаж не состоит в орденах.</p> : null}
      {c.orderIds.map((oid) => (
        <button key={oid} className="card row" onClick={() => nav(`/c/${c.id}/order/${oid}`)}>
          <Art src={img.order(oid)} className="thumb" /><b className="grow">{getOrder(oid)?.name}</b><span className="chev" aria-hidden="true">›</span>
        </button>
      ))}
      <Notice>{ORDER_NOTICE}</Notice>
      <button className="btn secondary" onClick={() => nav(`/c/${c.id}/orders/edit`)}>Изменить ордена</button>
    </Screen>
  );
}

export function SheetOrderInfo() {
  const { c, ready } = useCharacter();
  const { orderId = '' } = useParams();
  if (!ready) return null;
  if (!c || !getOrder(orderId)) return <Navigate to="/" replace />;
  return <Screen title={getOrder(orderId)!.name} left="back"><h2 className="title">{getOrder(orderId)!.name}</h2><OrderInfo id={orderId} /></Screen>;
}

/** Выбор орденов с проверкой доступа к Соулеру */
export function OrdersEditor({ orderIds, inventory, onCommit, onCancel }: {
  orderIds: string[]; inventory: InventoryItem[]; onCommit: (orderIds: string[], inventory: InventoryItem[]) => void; onCancel?: () => void;
}) {
  const [sel, setSel] = useState(orderIds);
  const [conflict, setConflict] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const commit = () => {
    if (accessConflicts(inventory, sel).length) { setConflict(true); return; }
    onCommit(sel, resolveAccess(inventory, sel, 'keep'));
  };
  return (
    <>
      <Notice>{ORDER_NOTICE}</Notice>
      <OrderPicker selected={sel} onToggle={toggle} onOpen={setInfo} />
      <div className="spacer" />
      <button className="btn" onClick={commit}>Применить</button>
      {onCancel ? <button className="btn secondary" onClick={onCancel}>Отмена</button> : null}
      {info ? <Sheet title={getOrder(info)!.name} onClose={() => setInfo(null)}><OrderInfo id={info} /></Sheet> : null}
      {conflict ? (
        <Sheet title="Конфликт доступа" onClose={() => setConflict(false)}>
          <p className="lead">Соулер доступен только ордену Тень. Что сделать с предметом?</p>
          <button className="btn" onClick={() => { setConflict(false); onCommit(sel, resolveAccess(inventory, sel, 'remove')); }}>Убрать Соулер</button>
          <button className="btn secondary" onClick={() => { setConflict(false); onCommit(sel, resolveAccess(inventory, sel, 'keep')); }}>Оставить как недоступный</button>
          <button className="btn secondary" onClick={() => setConflict(false)}>Вернуться к выбору</button>
        </Sheet>
      ) : null}
    </>
  );
}

export function SheetOrdersEdit() {
  const { c, ready } = useCharacter();
  const nav = useNavigate();
  const save = useStore((s) => s.saveCharacter);
  if (!ready) return null;
  if (!c) return <Navigate to="/" replace />;
  return (
    <Screen title="Изменить ордена" left="back">
      <h2 className="title">Ордена</h2>
      <p className="lead">Можно выбрать несколько или ни одного. Рангов и автоматических бонусов нет.</p>
      <OrdersEditor orderIds={c.orderIds} inventory={c.inventory}
        onCommit={async (orderIds, inventory) => { if (await save({ ...c, orderIds, inventory, updatedAt: Date.now() })) nav(`/c/${c.id}/orders`, { replace: true }); }} />
    </Screen>
  );
}

// ---------- Свойства и техники ----------
export function SheetTraits() {
  const { c, ready } = useCharacter();
  const nav = useNavigate();
  if (!ready) return null;
  if (!c) return <Navigate to="/" replace />;
  const s = getSubrace(c.subraceId)!;
  return (
    <Screen title="Врождённые свойства" left="back" footer={<button className="btn" onClick={() => nav(`/c/${c.id}`)}>К листу</button>}>
      <div className="eyebrow">Получено от подрасы</div>
      <h2 className="title">{s.traits.map((t) => (t.placeholder ? 'Врождённые свойства' : t.name)).join(', ')}</h2>
      <Portrait id={s.portrait} className="hero-img" />
      <TraitsBlock subraceId={s.id} />
      <span className="badge">{getRace(c.raceId)?.name} · {s.name}</span>
    </Screen>
  );
}

export function SheetTechniques() {
  const { c, ready } = useCharacter();
  const nav = useNavigate();
  if (!ready) return null;
  if (!c) return <Navigate to="/" replace />;
  return (
    <Screen title="Техники" left="back" footer={<button className="btn" onClick={() => nav(`/c/${c.id}`)}>К листу</button>}>
      <h2 className="title">Категории техник</h2>
      <p className="lead">Изучение техник появится позже.</p>
      {FUTURE_CATEGORIES.map((f) => (
        <div key={f.id} className="card row between"><div><b>{f.name}</b><div className="xs">Категория · пока без техник</div></div><span className="muted">—</span></div>
      ))}
      <Notice>Эти категории не расходуют очки подготовки и не добавляют способности.</Notice>
    </Screen>
  );
}

// ---------- Добавление предмета ----------
export function SheetAddItem() {
  const { c, ready } = useCharacter();
  const { weaponId } = useParams();
  const nav = useNavigate();
  const save = useStore((s) => s.saveCharacter);
  const [tab, setTab] = useState<'catalog' | 'custom'>('catalog');
  const [approved, setApproved] = useState(false);
  if (!ready) return null;
  if (!c) return <Navigate to="/" replace />;

  const add = async (input: Parameters<typeof makeItem>[0]) => {
    const chk = checkNewItem(input, c.currentCurrency);
    if (!chk.ok) return;
    const ok = await save({ ...c, inventory: [...c.inventory, makeItem(input)], currentCurrency: c.currentCurrency - chk.cost, updatedAt: Date.now() });
    if (ok) nav(`/c/${c.id}?tab=items`, { replace: true });
  };

  const w = getWeapon(weaponId);
  if (w) {
    const needOrder = w.accessOrder;
    const hasOrder = !needOrder || c.orderIds.includes(needOrder);
    return (
      <Screen title="Инвентарь" left="back">
        <h2 className="title">{w.name}</h2>
        <WeaponInfo w={w} build={c} />
        <Notice>{GEAR_NOTICE}</Notice>
        {!hasOrder ? (
          <Notice warn>Соулер доступен только персонажу с орденом Тень. Прочие условия согласуются с мастером.</Notice>
        ) : (
          <AcquireForm funds={c.currentCurrency} catalogId={w.id} extraOk={!needOrder || approved}
            onSubmit={(input) => add({ ...input, masterApproved: needOrder ? true : undefined })}
            extraBlock={needOrder ? (
              <label className="toggle"><input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} /><span className="small">Мастер разрешил моему персонажу Соулер</span></label>
            ) : null} />
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Инвентарь" left="back" footer={<button className="btn secondary" onClick={() => nav(`/c/${c.id}?tab=items`)}>К снаряжению</button>}>
      <h2 className="title">{tab === 'custom' ? 'Свой предмет' : 'Добавить предмет'}</h2>
      <Chips label="Источник предмета" value={tab} onChange={setTab} options={[{ id: 'catalog', label: 'Каталог' }, { id: 'custom', label: 'Свой предмет' }]} />
      <p className="xs">Доступно: {c.currentCurrency} Пи</p>
      {tab === 'catalog' ? <WeaponCatalog sheetMode orderIds={c.orderIds} onOpen={(wid) => nav(`/c/${c.id}/add/${wid}`)} /> : (
        <AcquireForm custom catalogId={null} funds={c.currentCurrency} submitLabel="Добавить" onSubmit={add} />
      )}
    </Screen>
  );
}


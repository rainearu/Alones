import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ATTRIBUTES, getOrder, getRace, getSubrace, getWeapon, img } from '../domain/content';
import { draftCurrency, makeItem, purchasesTotal } from '../domain/character';
import {
  healthMax, issueText, moraleMax, needsFreeBonus, originIssues, pointsLeft, preparationIssues, setRace, setSubrace,
  attributeValue, physicalSP, mentalSP,
} from '../domain/rules';
import type { CreationDraft, Step } from '../domain/types';
import { useStore } from '../store';
import { Art, Chips, Field, Notice, Portrait, Screen, Sheet, parseNonNeg } from '../ui/kit';
import { AcquireForm, GEAR_NOTICE, InventoryRow, ORDER_NOTICE, OrderPicker, WeaponCatalog, WeaponInfo } from '../ui/items';
import { FreeBonusPicker, PortraitPicker, RaceGrid, RaceInfo, SubracePicker } from '../ui/origin';
import { PrepEditor } from '../ui/PrepEditor';

export const STEP_NAMES = ['Раса', 'Подраса', 'Подготовка', 'Снаряжение', 'Ордена', 'Имя и образ', 'Проверка'];

/** Первый шаг, условие перехода которого не выполнено */
export function firstBlockedStep(d: CreationDraft): Step | null {
  if (!getRace(d.raceId)) return 1;
  if (originIssues(d).length) return 2;
  if (preparationIssues(d, 'creation').length) return 3;
  if (draftCurrency(d) < 0) return 4;
  if (!d.name.trim()) return 6;
  return null;
}

const Title = ({ step, title, lead }: { step: number; title: string; lead?: string }) => (
  <>
    <div className="eyebrow">Шаг {step} из 7</div>
    <h2 className="title">{title}</h2>
    {lead ? <p className="lead">{lead}</p> : null}
  </>
);

export default function Create() {
  const { step: stepParam = '1', sub } = useParams();
  const nav = useNavigate();
  const draft = useStore((s) => s.draft);
  const ready = useStore((s) => s.ready);
  const updateDraft = useStore((s) => s.updateDraft);
  const createFromDraft = useStore((s) => s.createFromDraft);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [gearTab, setGearTab] = useState<'weapons' | 'custom'>('weapons');
  const [creating, setCreating] = useState(false);
  const step = Math.min(7, Math.max(1, Number(stepParam) || 1)) as Step;

  useEffect(() => {
    if (draft && draft.currentStep !== step) updateDraft((d) => ({ ...d, currentStep: step }));
  }, [step, draft, updateDraft]);

  if (!ready) return null;
  if (!draft) return <Navigate to="/" replace />;

  const blocked = firstBlockedStep(draft);
  // Нельзя перепрыгнуть незавершённый шаг. Шаг 6 доступен, пока не заполнено имя.
  if (blocked !== null && step > blocked && !(blocked === 6 && step === 6)) return <Navigate to={`/create/${blocked}`} replace />;

  const go = (s: number, subPath?: string) => nav(`/create/${s}${subPath ? '/' + subPath : ''}`);
  const set = (fn: (d: CreationDraft) => CreationDraft) => updateDraft(fn);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ block: 'start' });
  const close = { icon: 'close' as const, label: 'Закрыть и сохранить черновик', onClick: () => nav('/') };
  const backTo = (s: number | 'home', subPath?: string) => ({
    icon: 'back' as const, label: 'Назад', onClick: () => (s === 'home' ? nav('/') : go(s, subPath)),
  });
  const funds = draftCurrency(draft);
  const race = getRace(draft.raceId);

  const shell = (p: { children: React.ReactNode; footer: React.ReactNode; back: ReturnType<typeof backTo>; overlay?: React.ReactNode }) => (
    <Screen key={step + (sub ?? '')} title="Создание персонажа" left={p.back} right={close} progress={step} footer={p.footer} overlayChildren={p.overlay}>
      {p.children}
    </Screen>
  );

  // ---------- Шаг 1 ----------
  if (step === 1) {
    const r = getRace(sub);
    if (sub && r) {
      return shell({
        back: backTo(1),
        footer: <button className="btn" onClick={() => { set((d) => ({ ...d, ...setRace(d, r.id) })); go(2); }}>Выбрать {r.name}</button>,
        children: <><Title step={1} title={r.name} lead={r.tagline || undefined} /><RaceInfo race={r} /></>,
      });
    }
    return shell({
      back: backTo('home'),
      footer: <button className="btn" disabled={!race} onClick={() => go(2)}>{race ? 'Далее' : 'Выбери расу'}</button>,
      children: <><Title step={1} title="Кем ты станешь?" lead="Выбери происхождение персонажа." /><RaceGrid selected={draft.raceId} onOpen={(id) => go(1, id)} /></>,
    });
  }

  // ---------- Шаг 2 ----------
  if (step === 2) {
    const prepConflicts = preparationIssues(draft, 'creation').filter((i) => i.code === 'cap');
    if (sub === 'bonus' && needsFreeBonus(draft)) {
      return shell({
        back: backTo(2),
        footer: <button className="btn" disabled={!draft.freeRaceBonus} onClick={() => go(3)}>Далее</button>,
        children: (
          <>
            <Title step={2} title="Дар происхождения" lead="Мелонианцы получают +1 к Харизме и +1 к другой характеристике. Бонус не расходует очки подготовки." />
            <FreeBonusPicker build={draft} onPick={(a) => set((d) => ({ ...d, freeRaceBonus: a }))} />
          </>
        ),
      });
    }
    const subOk = !!getSubrace(draft.subraceId) && getSubrace(draft.subraceId)!.raceId === draft.raceId;
    return shell({
      back: backTo(1),
      footer: <button className="btn" disabled={!subOk} onClick={() => go(needsFreeBonus(draft) ? 2 : 3, needsFreeBonus(draft) ? 'bonus' : undefined)}>{subOk ? 'Далее' : 'Выбери подрасу'}</button>,
      children: (
        <>
          <Title step={2} title="Твоя подраса" lead="Врождённые свойства появятся в листе автоматически." />
          <SubracePicker build={draft} onPick={(id) => set((d) => ({ ...d, ...setSubrace(d, id) }))} />
          {prepConflicts.length ? <Notice warn>После смены происхождения часть навыков выше предела. Исправь это на шаге «Подготовка».</Notice> : null}
        </>
      ),
    });
  }

  // ---------- Шаг 3 ----------
  if (step === 3) {
    const issues = preparationIssues(draft, 'creation');
    const left = pointsLeft(draft);
    const cap = issues.find((i) => i.code === 'cap');
    return shell({
      back: backTo(2, needsFreeBonus(draft) ? 'bonus' : undefined),
      footer: (
        <>
          {issues.length === 0 ? <p className="hint ok">✓ Все 10 очков распределены</p>
            : cap ? <p className="hint error-text">{issueText(cap)}</p>
              : <p className="hint">Изменение характеристики повышает связанные навыки.</p>}
          <button className="btn" disabled={issues.length > 0} onClick={() => go(4)}>
            {issues.length === 0 ? 'Далее' : left > 0 ? `Распредели ещё ${left} ${plural(left, 'очко', 'очка', 'очков')}` : 'Исправь ошибки'}
          </button>
        </>
      ),
      children: (
        <>
          <Title step={3} title="Подготовка" lead="Один запас очков для характеристик и навыков." />
          <PrepEditor build={draft} mode="creation" scrollTo={scrollTo} onChange={(b) => set((d) => ({ ...d, ...b }))} />
        </>
      ),
    });
  }

  // ---------- Шаг 4 ----------
  if (step === 4) {
    const w = sub?.startsWith('w-') ? getWeapon(sub.slice(2)) : undefined;
    if (w) {
      return shell({
        back: backTo(4),
        footer: w.starterSelectable ? null : <button className="btn secondary" onClick={() => go(4)}>К снаряжению</button>,
        children: (
          <>
            <Title step={4} title={w.name} />
            <WeaponInfo w={w} build={draft} />
            {w.starterSelectable ? (
              <AcquireForm funds={funds} catalogId={w.id} onSubmit={(input) => { set((d) => ({ ...d, purchases: [...d.purchases, makeItem(input)] })); go(4); }} />
            ) : (
              <Notice>Соулер связан с орденом Тени и не продаётся в стартовом каталоге. Его можно добавить в листе после создания, если выбрана Тень и мастер разрешил.</Notice>
            )}
          </>
        ),
      });
    }
    const spent = purchasesTotal(draft.purchases);
    return shell({
      back: backTo(3),
      footer: <button className="btn" disabled={funds < 0} onClick={() => go(5)}>{draft.purchases.length ? 'Далее' : 'Далее без снаряжения'}</button>,
      overlay: budgetOpen ? <BudgetSheet draft={draft} onClose={() => setBudgetOpen(false)} onSave={(v) => { set((d) => ({ ...d, startingCurrency: v })); setBudgetOpen(false); }} /> : null,
      children: (
        <>
          <Title step={4} title="Снаряжение" lead="Можно начать без покупок." />
          <Notice>{GEAR_NOTICE}</Notice>
          <div className="card">
            <div className="row between">
              <div><div className="xs">Стартовый бюджет</div><div className="h3" style={{ fontSize: 20 }}>{draft.startingCurrency} Пи</div></div>
              <button className="link" onClick={() => setBudgetOpen(true)}>Изменить</button>
            </div>
            {spent ? <div className="xs">Потрачено {spent} Пи · осталось {funds} Пи</div> : null}
          </div>
          <p className="xs">Одежда, обувь и браслет уже есть у персонажа и бюджет не расходуют.</p>
          {draft.purchases.length ? (
            <>
              <h2 className="h2">Добавлено</h2>
              {draft.purchases.map((it) => (
                <InventoryRow key={it.instanceId} item={it} build={draft}
                  onRemove={() => set((d) => ({ ...d, purchases: d.purchases.filter((x) => x.instanceId !== it.instanceId) }))} />
              ))}
            </>
          ) : null}
          <Chips label="Раздел снаряжения" value={gearTab} onChange={setGearTab} options={[{ id: 'weapons', label: 'Оружие' }, { id: 'custom', label: 'Своё снаряжение' }]} />
          {gearTab === 'weapons' ? <WeaponCatalog sheetMode={false} orderIds={draft.orderIds} onOpen={(id) => go(4, 'w-' + id)} /> : (
            <AcquireForm key={draft.purchases.length} custom catalogId={null} funds={funds}
              onSubmit={(input) => { set((d) => ({ ...d, purchases: [...d.purchases, makeItem(input)] })); setGearTab('weapons'); }} />
          )}
        </>
      ),
    });
  }

  // ---------- Шаг 5 ----------
  if (step === 5) {
    const toggle = (id: string) => set((d) => ({ ...d, orderIds: d.orderIds.includes(id) ? d.orderIds.filter((x) => x !== id) : [...d.orderIds, id] }));
    const o = sub ? getOrder(sub) : undefined;
    if (o) {
      const on = draft.orderIds.includes(o.id);
      return shell({
        back: backTo(5),
        footer: <button className={'btn' + (on ? ' secondary' : '')} onClick={() => { toggle(o.id); go(5); }}>{on ? 'Убрать орден' : 'Выбрать орден'}</button>,
        children: <><Title step={5} title={o.name} /><OrderInfo id={o.id} /></>,
      });
    }
    return shell({
      back: backTo(4),
      footer: <button className="btn" onClick={() => go(6)}>{draft.orderIds.length ? 'Далее' : 'Далее без ордена'}</button>,
      children: (
        <>
          <Title step={5} title="Твои ордена" lead="Можно выбрать несколько или продолжить без ордена." />
          <Notice>{ORDER_NOTICE}</Notice>
          <OrderPicker selected={draft.orderIds} onToggle={toggle} onOpen={(id) => go(5, id)} />
        </>
      ),
    });
  }

  // ---------- Шаг 6 ----------
  const portrait = draft.portraitId ?? race?.portrait ?? 'human';
  if (step === 6) {
    if (sub === 'portrait') {
      return shell({
        back: backTo(6),
        footer: <button className="btn" onClick={() => go(6)}>Выбрать портрет</button>,
        children: (
          <>
            <Title step={6} title="Портрет" lead="Выбери образ из галереи." />
            <PortraitPicker value={portrait} onPick={(id) => set((d) => ({ ...d, portraitId: id }))} />
            <Notice>Портрет не меняет расу или свойства персонажа.</Notice>
          </>
        ),
      });
    }
    const nameOk = !!draft.name.trim();
    return shell({
      back: backTo(5),
      footer: <button className="btn" disabled={!nameOk} onClick={() => go(7)}>{nameOk ? 'Далее' : 'Укажи имя'}</button>,
      children: (
        <>
          <Title step={6} title="Имя и образ" lead="Как тебя запомнит Элония?" />
          <button type="button" style={{ width: '100%' }} onClick={() => go(6, 'portrait')} aria-label="Выбрать портрет">
            <Portrait id={portrait} className="hero-img" />
          </button>
          <div className="center"><button className="link" onClick={() => go(6, 'portrait')}>Выбрать портрет</button></div>
          <Field label="Имя персонажа *" value={draft.name} maxLength={60} onChange={(v) => set((d) => ({ ...d, name: v }))} />
          <Field label="Короткая история · необязательно" multiline value={draft.notes} maxLength={2000} onChange={(v) => set((d) => ({ ...d, notes: v }))} />
        </>
      ),
    });
  }

  // ---------- Шаг 7 ----------
  const sub7 = getSubrace(draft.subraceId)!;
  const allOk = firstBlockedStep(draft) === null;
  const doCreate = async () => {
    if (creating) return;
    setCreating(true);
    const id = await createFromDraft();
    setCreating(false);
    if (id) nav(`/c/${id}`, { replace: true });
  };
  const editLink = (s: number, label = 'Изменить') => <button className="link" onClick={() => go(s)}>{label}</button>;
  return shell({
    back: backTo(6),
    footer: <button className="btn" disabled={!allOk || creating} onClick={doCreate}>{creating ? 'Создаём…' : 'Создать персонажа'}</button>,
    children: (
      <>
        <Title step={7} title="Готов к истории" lead="Проверь лист перед созданием." />
        <div className="card row">
          <Portrait id={portrait} />
          <div className="grow"><h3 className="h3 clamp2">{draft.name}</h3><span className="xs">{race?.name} · {sub7.name}</span></div>
          {editLink(6)}
        </div>
        <div className="card">
          <div className="row between"><span>Здоровье</span><b>{healthMax(draft)} / {healthMax(draft)}</b></div>
          <div className="divider" />
          <div className="row between"><span>Мораль</span><b>{moraleMax(draft)} / {moraleMax(draft)}</b></div>
          <div className="divider" />
          <div className="row between"><span>Физическая СП</span><b>{physicalSP(draft)}</b></div>
          <div className="row between"><span>Ментальная СП</span><b>{mentalSP(draft)}</b></div>
        </div>
        <div className="card">
          <div className="row between"><h3 className="h3">Подготовка</h3>{editLink(3)}</div>
          <p className="small muted mb0">{ATTRIBUTES.map((a) => `${a.name} ${attributeValue(draft, a.id)}`).join(' · ')}</p>
          {pointsLeft(draft) === 0 ? <div className="small green">Все 10 очков распределены</div> : null}
        </div>
        <div className="card">
          <div className="row between"><h3 className="h3">Происхождение</h3>{editLink(1)}</div>
          <p className="small muted mb0">{race?.name} · {sub7.name}{draft.freeRaceBonus ? ` · дар: +1 ${ATTRIBUTES.find((a) => a.id === draft.freeRaceBonus)!.name}` : ''}</p>
          <p className="small muted mb0">Врождённые свойства: {sub7.traits.map((t) => (t.placeholder ? 'уточняются' : t.name)).join(', ')}</p>
        </div>
        <div className="card">
          <div className="row between"><h3 className="h3">Ордена</h3>{editLink(5)}</div>
          <p className="small muted mb0">{draft.orderIds.length ? draft.orderIds.map((id) => getOrder(id)!.name).join(' · ') : 'Без ордена'}</p>
        </div>
        <div className="card">
          <div className="row between"><h3 className="h3">Снаряжение и средства</h3>{editLink(4)}</div>
          <p className="small muted mb0">{draft.purchases.length ? `${draft.purchases.length} ${plural(draft.purchases.length, 'предмет', 'предмета', 'предметов')}` : 'Без покупок'} · {funds} Пи</p>
        </div>
        {draft.notes.trim() ? <div className="card"><h3 className="h3">История</h3><p className="small muted mb0" style={{ whiteSpace: 'pre-line' }}>{draft.notes.trim()}</p></div> : null}
      </>
    ),
  });
}

export function OrderInfo({ id }: { id: string }) {
  const o = getOrder(id)!;
  return (
    <>
      <Art src={img.order(o.id)} className="hero-img" />
      <Notice>{ORDER_NOTICE}</Notice>
      {o.id === 'shadow' ? <h2 className="h2">Соулер</h2> : null}
      <p className="p">{o.description || 'Описание ордена появится позже.'}</p>
      <p className="p">Выбор ордена сам по себе не добавляет техники и не меняет характеристики. Рангов нет.</p>
    </>
  );
}

function BudgetSheet({ draft, onClose, onSave }: { draft: CreationDraft; onClose: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(draft.startingCurrency));
  const spent = purchasesTotal(draft.purchases);
  const num = parseNonNeg(v);
  const err = num === null ? 'Неотрицательное целое число.' : num < spent ? `Уже потрачено ${spent} Пи — бюджет не может быть меньше.` : null;
  return (
    <Sheet title="Стартовый бюджет" onClose={onClose}>
      <p className="lead">Укажи сумму, согласованную с мастером.</p>
      <Field label="Пи" value={v} onChange={setV} inputMode="numeric" maxLength={7} error={err} />
      <p className="small muted">Уже потрачено: {spent} Пи<br />После изменения останется: {num !== null && !err ? num - spent : '—'} Пи</p>
      <button className="btn" disabled={!!err} onClick={() => num !== null && onSave(num)}>Сохранить</button>
    </Sheet>
  );
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

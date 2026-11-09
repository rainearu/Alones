import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { applyEdit } from '../domain/character';
import { getRace } from '../domain/content';
import {
  adjustCurrent, healthMax, issueText, moraleMax, needsFreeBonus, originIssues, preparationIssues, setRace, setSubrace,
  attributeValue,
} from '../domain/rules';
import type { Character } from '../domain/types';
import { useStore } from '../store';
import { Field, Notice, Screen, Sheet, parseNonNeg } from '../ui/kit';
import { InventoryRow } from '../ui/items';
import { FreeBonusPicker, PortraitPicker, RaceGrid, SubracePicker } from '../ui/origin';
import { PrepEditor } from '../ui/PrepEditor';
import { OrdersEditor } from './CharacterSheet';

type Section = null | 'identity' | 'origin' | 'stats' | 'orders' | 'gear' | 'notes';
const SECTIONS: [Exclude<Section, null>, string][] = [
  ['identity', 'Имя и портрет'], ['origin', 'Раса и подраса'], ['stats', 'Характеристики и навыки'],
  ['orders', 'Ордена'], ['gear', 'Снаряжение и средства'], ['notes', 'История и заметки'],
];

export default function Edit() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const original = useStore((s) => s.characters.find((x) => x.id === id));
  const ready = useStore((s) => s.ready);
  const save = useStore((s) => s.saveCharacter);
  const [w, setW] = useState<Character | null>(original ?? null);
  const [section, setSection] = useState<Section>(null);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [money, setMoney] = useState(w ? String(w.currentCurrency) : '0');
  const [busy, setBusy] = useState(false);

  if (!ready) return null;
  if (!original || !w) return <Navigate to="/" replace />;

  const patch = (p: Partial<Character>) => setW({ ...w, ...p });
  const dirty = JSON.stringify(w) !== JSON.stringify(original) || money !== String(original.currentCurrency);
  const moneyNum = parseNonNeg(money);
  const issues = [
    ...(w.name.trim() ? [] : ['Укажи имя персонажа.']),
    ...originIssues(w).map(issueText),
    ...preparationIssues(w, 'edit').map(issueText),
    ...(moneyNum === null ? ['Средства — неотрицательное целое число.'] : []),
  ];
  const leave = () => (dirty ? setLeaveAsk(true) : nav(-1));
  const scrollTo = (elId: string) => document.getElementById(elId)?.scrollIntoView({ block: 'start' });

  const doSave = async () => {
    if (issues.length || busy) return;
    setBusy(true);
    const next = applyEdit(original, { ...w, name: w.name.trim(), notes: w.notes.trim(), currentCurrency: moneyNum! });
    const ok = await save(next);
    setBusy(false);
    if (ok) nav(`/c/${id}`, { replace: true });
  };

  const hOld = healthMax(original), hNew = healthMax(w), mOld = moraleMax(original), mNew = moraleMax(w);
  const hCur = adjustCurrent(w.healthCurrent, hNew), mCur = adjustCurrent(w.moraleCurrent, mNew);

  // ---------- Разделы ----------
  if (section) {
    const title = SECTIONS.find((s) => s[0] === section)![1];
    const back = { icon: 'back' as const, label: 'К разделам', onClick: () => setSection(null) };
    const done = <button className="btn" onClick={() => setSection(null)}>Готово</button>;
    return (
      <Screen key={section} title={title} left={back} footer={section === 'orders' ? null : done}>
        {section === 'identity' ? (
          <>
            <Field label="Имя персонажа *" value={w.name} maxLength={60} onChange={(v) => patch({ name: v })} error={w.name.trim() ? null : 'Имя не может быть пустым.'} />
            <h2 className="h2">Портрет</h2>
            <PortraitPicker value={w.portraitId} onPick={(p) => patch({ portraitId: p })} />
          </>
        ) : null}
        {section === 'origin' ? (
          <>
            <Notice>Смена происхождения пересчитает бонусы, СП и врождённые свойства. Вложения сохраняются; несовместимые значения будут отмечены.</Notice>
            <RaceGrid selected={w.raceId} onOpen={(r) => setW({ ...w, ...setRace(w, r) })} />
            <h2 className="h2">Подраса</h2>
            <SubracePicker build={w} onPick={(s) => setW({ ...w, ...setSubrace(w, s) })} />
            {needsFreeBonus(w) ? (<><h2 className="h2">Дар происхождения</h2><FreeBonusPicker build={w} onPick={(a) => patch({ freeRaceBonus: a })} /></>) : null}
          </>
        ) : null}
        {section === 'stats' ? (
          <>
            <Notice>Изменения по договорённости с мастером. Предел навыка — удвоенная характеристика; характеристика не ниже 1.</Notice>
            <PrepEditor build={w} mode="edit" scrollTo={scrollTo} onChange={(b) => setW({ ...w, ...b })} />
          </>
        ) : null}
        {section === 'orders' ? (
          <OrdersEditor orderIds={w.orderIds} inventory={w.inventory} onCancel={() => setSection(null)}
            onCommit={(orderIds, inventory) => { setW({ ...w, orderIds, inventory }); setSection(null); }} />
        ) : null}
        {section === 'gear' ? (
          <>
            <Field label="Средства, Пи" value={money} onChange={setMoney} inputMode="numeric" maxLength={7}
              error={moneyNum === null ? 'Неотрицательное целое число.' : null} help="Удаление вещей не возвращает средства автоматически." />
            <h2 className="h2">Инвентарь</h2>
            {w.inventory.map((it) => (
              <InventoryRow key={it.instanceId} item={it} build={w}
                onRemove={it.acquisitionType === 'starting' ? undefined : () => patch({ inventory: w.inventory.filter((x) => x.instanceId !== it.instanceId) })} />
            ))}
            <p className="xs">Новые предметы добавляются в листе, раздел «Вещи».</p>
          </>
        ) : null}
        {section === 'notes' ? (
          <Field label="История и заметки" multiline value={w.notes} maxLength={4000} onChange={(v) => patch({ notes: v })} />
        ) : null}
      </Screen>
    );
  }

  const strChanged = attributeValue(original, 'str') !== attributeValue(w, 'str');
  const spiChanged = attributeValue(original, 'spi') !== attributeValue(w, 'spi');

  return (
    <Screen title="Редактирование" left={{ icon: 'back', label: 'Назад', onClick: leave }} right={{ icon: 'close', label: 'Отменить изменения', onClick: leave }}
      footer={<>
        {issues.length ? <p className="hint error-text">{issues[0]}</p> : null}
        <button className="btn" disabled={!dirty || issues.length > 0 || busy} onClick={doSave}>Сохранить изменения</button>
      </>}
      overlayChildren={leaveAsk ? (
        <Sheet title="Отменить изменения?" onClose={() => setLeaveAsk(false)}>
          <p className="lead">Несохранённые правки будут потеряны. Лист останется прежним.</p>
          <button className="btn danger" onClick={() => nav(`/c/${id}`, { replace: true })}>Отменить изменения</button>
          <button className="btn secondary" onClick={() => setLeaveAsk(false)}>Продолжить редактирование</button>
        </Sheet>
      ) : null}>
      <h2 className="title">Редактирование</h2>
      <p className="lead">{original.name} · изменения по договорённости с мастером.</p>
      {SECTIONS.map(([key, label]) => (
        <button key={key} className="sectionrow" onClick={() => setSection(key)}>
          <span>{label}{key === 'origin' ? <span className="xs" style={{ display: 'block' }}>{getRace(w.raceId)?.name}</span> : null}</span>
          <span className="chev" aria-hidden="true">›</span>
        </button>
      ))}
      <Notice>Изменения Силы и Духа пересчитают максимумы здоровья и морали.</Notice>
      {strChanged || spiChanged ? (
        <>
          <h2 className="h2">Что изменится</h2>
          <div className="card">
            {strChanged ? <div className="row between"><span>Здоровье</span><b>{original.healthCurrent} / {hOld} → {hCur} / {hNew}</b></div> : null}
            {strChanged && spiChanged ? <div className="divider" /> : null}
            {spiChanged ? <div className="row between"><span>Мораль</span><b>{original.moraleCurrent} / {mOld} → {mCur} / {mNew}</b></div> : null}
          </div>
        </>
      ) : null}
      {issues.length > 1 ? <Notice warn>{issues.map((i) => <div key={i}>{i}</div>)}</Notice> : null}
    </Screen>
  );
}

import { useMemo, useState } from 'react';
import { ATTRIBUTES, ATTR_SHORT, SKILLS, img } from '../domain/content';
import {
  ATTR_COST, MIN_ATTRIBUTE_IN_EDIT, POINTS, attributeDecBlockers, attributeValue, canDecAttribute, canDecSkill,
  canIncAttribute, canIncSkill, changeAttributeInvestment, changeSkillInvestment, pointsLeft, setAttributeFinal,
  setSkillFinal, skillCap, skillOwn, skillValue,
} from '../domain/rules';
import type { AttrId, Build } from '../domain/types';
import { Art, Chips, Stepper } from './kit';

type Filter = 'all' | AttrId | 'prof';

/** Характеристики, навыки и владения на одной странице.
 *  creation — общий бюджет 10 очков; edit — прямое изменение итогов без бюджета. */
export function PrepEditor({ build, onChange, mode, scrollTo }: {
  build: Build; onChange: (b: Build) => void; mode: 'creation' | 'edit'; scrollTo: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const left = pointsLeft(build);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return SKILLS.filter((s) =>
      (filter === 'all' || (filter === 'prof' ? s.kind === 'proficiency' : s.attribute === filter && s.kind === 'skill')) &&
      (!t || s.name.toLowerCase().includes(t)));
  }, [q, filter]);

  const skillsList = shown.filter((s) => s.kind === 'skill');
  const profList = shown.filter((s) => s.kind === 'proficiency');

  function skillRow(id: string) {
    const s = SKILLS.find((x) => x.id === id)!;
    const a = attributeValue(build, s.attribute);
    const own = skillOwn(build, s.id);
    const v = skillValue(build, s.id);
    const cap = skillCap(build, s.id);
    const over = v > cap;
    const creation = mode === 'creation';
    const canInc = creation ? canIncSkill(build, s.id) : v + 1 <= cap;
    const canDec = creation ? canDecSkill(build, s.id) : own > 0;
    return (
      <div className="ctl" key={s.id}>
        <div className="label">
          <b>{s.name}</b>
          <div className="statdesc">{s.description}</div>
          <div className="xs">{ATTR_SHORT[s.attribute]} {a}{own ? ` + ${own}` : ''} · предел {cap}</div>
          {over ? <div className="err">Выше предела на {v - cap}. Снизь навык.</div> : null}
        </div>
        <Stepper
          label={s.name} value={v} canInc={canInc} canDec={canDec}
          incHint={v + 1 > cap ? 'Достигнут предел навыка' : creation && left < 1 ? 'Нет свободных очков' : undefined}
          onInc={() => onChange(creation ? changeSkillInvestment(build, s.id, 1) : setSkillFinal(build, s.id, v + 1))}
          onDec={() => onChange(creation ? changeSkillInvestment(build, s.id, -1) : setSkillFinal(build, s.id, v - 1))}
        />
      </div>
    );
  }

  return (
    <>
      {mode === 'creation' ? (
        <div className={'budget' + (left < 0 ? ' over' : '')} aria-live="polite">
          <div><b>{left} из {POINTS}</b><div className="xs">очков осталось</div></div>
          <div className="xs" style={{ textAlign: 'right' }}>Характеристика +1 = {ATTR_COST}<br />Навык +1 = 1</div>
        </div>
      ) : null}
      {mode === 'creation' && left > 0 && left < ATTR_COST ? (
        <div className="xs" style={{ marginTop: 6 }}>На характеристику нужно {ATTR_COST} очка — осталось {left}. Вложи их в навыки.</div>
      ) : null}

      <button type="button" className="link" onClick={() => scrollTo('prep-skills')}>Перейти к навыкам ↓</button>
      <h2 className="h2" id="prep-attrs" style={{ marginTop: 6 }}>Характеристики</h2>
      {ATTRIBUTES.map((at) => {
        const v = attributeValue(build, at.id);
        const blockers = mode === 'creation' && (build.attributeInvestments[at.id] ?? 0) > 0 ? attributeDecBlockers(build, at.id) : [];
        const canInc = mode === 'creation' ? canIncAttribute(build) : true;
        const canDec = mode === 'creation' ? canDecAttribute(build, at.id) : v > MIN_ATTRIBUTE_IN_EDIT;
        return (
          <div className="ctl" key={at.id}>
            <Art src={img.group(at.id)} className="thumb xs" />
            <div className="label">
              <b>{at.name}</b>
              <div className="statdesc">{at.description}</div>
              {blockers.length ? <div className="err">Чтобы снизить, сначала уменьши: {blockers.join(', ')}.</div> : null}
            </div>
            <Stepper
              label={at.name} value={v} canInc={canInc} canDec={canDec}
              incHint={!canInc ? `Нужно ${ATTR_COST} свободных очка` : undefined}
              onInc={() => onChange(mode === 'creation' ? changeAttributeInvestment(build, at.id, 1) : setAttributeFinal(build, at.id, v + 1))}
              onDec={() => onChange(mode === 'creation' ? changeAttributeInvestment(build, at.id, -1) : setAttributeFinal(build, at.id, v - 1))}
            />
          </div>
        );
      })}

      <h2 className="h2" id="prep-skills">Навыки</h2>
      <button type="button" className="link" style={{ marginTop: -10 }} onClick={() => scrollTo('prep-attrs')}>↑ К характеристикам</button>
      <label className="field" style={{ marginTop: 4 }}>
        <span>Поиск навыка</span>
        <input className="input" type="search" placeholder="Название навыка…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <Chips<Filter>
        label="Фильтр навыков" value={filter} onChange={setFilter}
        options={[{ id: 'all', label: 'Все' }, ...ATTRIBUTES.map((a) => ({ id: a.id as Filter, label: a.name })), { id: 'prof', label: 'Владение' }]}
      />
      {skillsList.map((s) => skillRow(s.id))}
      {profList.length ? <h2 className="h2" id="prep-prof">Владение оружием</h2> : null}
      {profList.map((s) => skillRow(s.id))}
      {!shown.length ? <p className="p">Ничего не найдено.</p> : null}
    </>
  );
}

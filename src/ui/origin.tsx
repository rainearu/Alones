import { ATTRIBUTES, ATTR_SHORT, PORTRAITS, RACES, getRace, getSubrace } from '../domain/content';
import { freeBonusOptions } from '../domain/rules';
import type { AttrId, Build, Race } from '../domain/types';
import { Check, Notice, Portrait } from './kit';

export const bonusText = (r: Race) => {
  const parts = Object.keys(r.bonuses).map((k) => '+1 ' + ATTR_SHORT[k as AttrId]);
  if (r.freeBonus) parts.push('+1 другая');
  return parts.join(' · ');
};

export function RaceGrid({ selected, onOpen }: { selected: string | null; onOpen: (id: string) => void }) {
  return (
    <div className="racegrid">
      {RACES.map((r) => (
        <button key={r.id} type="button" className={'race' + (r.id === selected ? ' selected' : '')} onClick={() => onOpen(r.id)}
          aria-label={`${r.name}, ${bonusText(r)}${r.id === selected ? ', выбрано' : ''}`}>
          <Portrait id={r.portrait} className="" />
          <span className="info" style={{ display: 'block' }}>
            <span className="row between"><b>{r.name}</b>{r.id === selected ? <Check on /> : null}</span>
            <span className="xs">{bonusText(r)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function RaceInfo({ race }: { race: Race }) {
  return (
    <>
      <Portrait id={race.portrait} className="hero-img" />
      <div className="card row between"><span>Расовые бонусы</span><span className="badge">{bonusText(race)}</span></div>
      {race.description ? <p className="p">{race.description}</p> : null}
      <h2 className="h2">Подрасы</h2>
      <p className="p">{race.subraces.map((s) => getSubrace(s)!.name).join(', ')}</p>
    </>
  );
}

export function SubracePicker({ build, onPick }: { build: Build; onPick: (id: string) => void }) {
  const race = getRace(build.raceId);
  if (!race) return null;
  const sub = getSubrace(build.subraceId);
  return (
    <>
      <div role="radiogroup" aria-label="Подраса">
        {race.subraces.map((id) => {
          const s = getSubrace(id)!;
          const on = id === build.subraceId;
          return (
            <button key={id} type="button" role="radio" aria-checked={on} className={'card row' + (on ? ' selected' : '')} onClick={() => onPick(id)}>
              <Portrait id={s.portrait} />
              <span className="grow">
                <b style={{ display: 'block' }}>{s.name}</b>
                <span className="xs">{s.traits.map((t) => t.placeholder ? 'Свойства уточняются' : t.name).join(' · ')}</span>
                <span className="xs" style={{ display: 'block' }}>Базовая СП: физ. {s.physicalBase} · мент. {s.mentalBase}</span>
              </span>
              <Check on={on} />
            </button>
          );
        })}
      </div>
      {sub ? <TraitsBlock subraceId={sub.id} /> : null}
    </>
  );
}

export function TraitsBlock({ subraceId }: { subraceId: string }) {
  const s = getSubrace(subraceId)!;
  return (
    <>
      {s.traits.map((t) => (
        <div key={t.id}>
          <h2 className="h2">{t.name}</h2>
          <p className="p">{t.placeholder ? 'Отдельные врождённые способности пока не закреплены.' : t.text}</p>
        </div>
      ))}
      {s.conditionalNotes.map((n) => <Notice key={n}>Условие: {n}. Не прибавляется к постоянной СП.</Notice>)}
      <Notice>Это свойство уже твоё — выбирать и покупать его не нужно.</Notice>
    </>
  );
}

export function FreeBonusPicker({ build, onPick }: { build: Build; onPick: (a: AttrId) => void }) {
  const opts = freeBonusOptions(build);
  return (
    <div role="radiogroup" aria-label="Свободный бонус">
      {ATTRIBUTES.filter((a) => opts.includes(a.id)).map((a) => {
        const on = build.freeRaceBonus === a.id;
        return (
          <button key={a.id} type="button" role="radio" aria-checked={on} className={'card row between' + (on ? ' selected' : '')} onClick={() => onPick(a.id)}>
            <span>{a.name}</span>
            {on ? <span className="badge">+1</span> : <Check on={false} />}
          </button>
        );
      })}
    </div>
  );
}

export function PortraitPicker({ value, onPick }: { value: string | null; onPick: (id: string) => void }) {
  return (
    <div className="portraitgrid">
      {PORTRAITS.map((p) => (
        <button key={p.id} type="button" aria-pressed={p.id === value} aria-label={`Портрет: ${p.label}`} onClick={() => onPick(p.id)}>
          <Portrait id={p.id} className="" />
          <span className="cap">{p.label}</span>
          {p.id === value ? <span className="tick"><Check on /></span> : null}
        </button>
      ))}
    </div>
  );
}

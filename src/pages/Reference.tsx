import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ARTICLES } from '../domain/content';
import { useStore } from '../store';
import { BottomNav, Field, Notice, Screen } from '../ui/kit';
import { PortraitPicker } from '../ui/origin';
import { useSectionChrome } from './Home';

const EMPTY_BODY = 'Текст статьи появится позже.';

export function LoreIndex() {
  const nav = useNavigate();
  const chrome = useSectionChrome();
  return (
    <Screen title="Мир и лор" left={chrome.left} right={chrome.right} footer={<BottomNav />} footerClass="navfoot" overlayChildren={chrome.overlays}>
      <div className="eyebrow">Мир мёртвых</div>
      <h2 className="title">Элония</h2>
      <p className="lead">Мир, где души из множества вселенных обретают новую оболочку.</p>
      {ARTICLES.lore.map((a) => (
        <button key={a.id} className="card row between" onClick={() => nav(`/lore/${a.id}`)}>{a.title}<span className="chev" aria-hidden="true">›</span></button>
      ))}
    </Screen>
  );
}

function Article({ section }: { section: 'lore' | 'rulebook' }) {
  const { articleId = '' } = useParams();
  const nav = useNavigate();
  const a = ARTICLES[section].find((x) => x.id === articleId);
  if (!a) return <Navigate to={section === 'lore' ? '/lore' : '/rules'} replace />;
  const backPath = section === 'lore' ? '/lore' : '/rules';
  return (
    <Screen title={section === 'lore' ? 'Мир и лор' : 'Правило'} left={{ icon: 'back', label: 'Назад', onClick: () => nav(backPath) }}
      footer={<button className="btn" onClick={() => nav(backPath)}>{section === 'lore' ? 'К миру и лору' : 'К оглавлению'}</button>}>
      <div className="eyebrow">{section === 'lore' ? 'Мир Элонии' : 'Рулбук'}</div>
      <h2 className="title">{a.title}</h2>
      <p className="p">{a.body || EMPTY_BODY}</p>
      <Notice>Версия материалов: {ARTICLES.contentVersion}</Notice>
    </Screen>
  );
}

export const LoreArticle = () => <Article section="lore" />;
export const RuleArticle = () => <Article section="rulebook" />;

export function RulesIndex() {
  const nav = useNavigate();
  const chrome = useSectionChrome();
  const [q, setQ] = useState('');
  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ARTICLES.rulebook.filter((a) => !t || a.title.toLowerCase().includes(t) || a.body.toLowerCase().includes(t));
  }, [q]);
  return (
    <Screen title="Рулбук" left={chrome.left} right={chrome.right} footer={<BottomNav />} footerClass="navfoot" overlayChildren={chrome.overlays}>
      <h2 className="title">Рулбук</h2>
      <p className="lead">Правила всегда под рукой.</p>
      <label className="field">
        <span>Поиск</span>
        <input className="input" type="search" placeholder="Термин или правило…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {found.map((a) => (
        <button key={a.id} className="card row between" onClick={() => nav(`/rules/${a.id}`)}><b>{a.title}</b><span className="chev" aria-hidden="true">›</span></button>
      ))}
      {!found.length ? (
        <div className="empty" style={{ paddingTop: 24 }}>
          <h2>Ничего не найдено</h2>
          <p className="p">По запросу «{q.trim()}» статей нет.</p>
          <button className="btn secondary" onClick={() => setQ('')}>Очистить запрос</button>
        </div>
      ) : null}
    </Screen>
  );
}

export function Profile() {
  const nav = useNavigate();
  const { profile, saveProfile } = useStore();
  const [name, setName] = useState(profile.displayName);
  const [portrait, setPortrait] = useState(profile.portraitId);
  const [pick, setPick] = useState(false);
  const ok = !!name.trim();
  return (
    <Screen title="Профиль" left="back" right={{ icon: 'close', label: 'Закрыть', onClick: () => nav('/') }}
      footer={<button className="btn" disabled={!ok} onClick={async () => { if (await saveProfile({ ...profile, displayName: name.trim(), portraitId: portrait })) nav('/'); }}>Сохранить</button>}>
      <h2 className="title">Профиль игрока</h2>
      <div className="center" style={{ margin: '20px 0' }}>
        <button onClick={() => setPick(!pick)} aria-label="Сменить аватар" style={{ display: 'inline-block' }}>
          <img className="thumb round" style={{ width: 84, height: 84 }} src={`${import.meta.env.BASE_URL}img/portraits/${portrait}.webp`} alt="" />
        </button>
        <div><button className="link" onClick={() => setPick(!pick)}>{pick ? 'Скрыть галерею' : 'Сменить аватар'}</button></div>
      </div>
      {pick ? <PortraitPicker value={portrait} onPick={setPortrait} /> : null}
      <Field label="Имя" value={name} onChange={setName} maxLength={40} error={ok ? null : 'Укажи имя.'} />
      <div className="row between"><span>Статус аккаунта</span><span className="badge">{profile.accountStatus === 'premium' ? 'Премиум' : 'Базовый'}</span></div>
      <Notice>Персонажи хранятся на этом устройстве.</Notice>
      <p className="xs">Аватар и имя видны только тебе.</p>
    </Screen>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { originLabel } from '../domain/content';
import type { Character } from '../domain/types';
import { useStore } from '../store';
import { BottomNav, Drawer, Icon, Portrait, Screen, Sheet } from '../ui/kit';
import { STEP_NAMES } from './Create';

export function ProfileRow() {
  const profile = useStore((s) => s.profile);
  return (
    <div className="profile-row">
      <Portrait id={profile.portraitId} className="thumb round" />
      <div className="grow"><h3 className="h3 clamp2">{profile.displayName}</h3><span className="xs">Профиль игрока</span></div>
      <span className="badge">{profile.accountStatus === 'premium' ? 'Премиум' : 'Базовый'}</span>
    </div>
  );
}

/** Общие элементы разделов с нижней навигацией: меню и плейсхолдер аккаунта */
export function useSectionChrome() {
  const nav = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [account, setAccount] = useState(false);
  const overlays = (
    <>
      {drawer ? (
        <Drawer onClose={() => setDrawer(false)}>
          <ProfileRow />
          <h2 className="title">Меню</h2>
          {[['Профиль игрока', '/profile'], ['Персонажи', '/'], ['Мир и лор', '/lore'], ['Рулбук', '/rules']].map(([n, to]) => (
            <button key={to} className="sectionrow" onClick={() => { setDrawer(false); nav(to); }}>{n}<span className="chev" aria-hidden="true">›</span></button>
          ))}
          <p className="xs" style={{ marginTop: 32 }}>Данные сохраняются на этом устройстве.</p>
        </Drawer>
      ) : null}
      {account ? (
        <Sheet title="Аккаунт" onClose={() => setAccount(false)}>
          <p className="lead">Здесь появится информация об аккаунте. Сейчас регистрация не нужна: персонажи хранятся на этом устройстве.</p>
          <button className="btn secondary" onClick={() => setAccount(false)}>Понятно</button>
        </Sheet>
      ) : null}
    </>
  );
  return {
    left: { icon: 'menu' as const, label: 'Меню', onClick: () => setDrawer(true) },
    right: { icon: 'more' as const, label: 'Аккаунт', onClick: () => setAccount(true) },
    overlays,
  };
}

export default function Home() {
  const nav = useNavigate();
  const { characters, draft, startDraft, deleteCharacter, discardDraft } = useStore();
  const chrome = useSectionChrome();
  const [menuFor, setMenuFor] = useState<Character | null>(null);
  const [confirmDel, setConfirmDel] = useState<Character | null>(null);
  const [draftAsk, setDraftAsk] = useState(false);
  const [replaceAsk, setReplaceAsk] = useState(false);

  const list = [...characters].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);

  const create = async () => {
    if (draft) { setDraftAsk(true); return; }
    await startDraft();
    nav('/create/1');
  };

  const overlays = (
    <>
      <button className="fab" aria-label="Создать персонажа" onClick={create}>{Icon.plus}</button>
      {chrome.overlays}
      {menuFor ? (
        <Sheet title={menuFor.name} onClose={() => setMenuFor(null)}>
          <p className="lead">{originLabel(menuFor.raceId, menuFor.subraceId)}</p>
          <button className="btn" onClick={() => nav(`/c/${menuFor.id}/edit`)}>Редактировать</button>
          <button className="btn danger" onClick={() => { setConfirmDel(menuFor); setMenuFor(null); }}>Удалить</button>
        </Sheet>
      ) : null}
      {confirmDel ? (
        <Sheet title={`Удалить «${confirmDel.name}»?`} onClose={() => setConfirmDel(null)}>
          <p className="lead">Лист и все изменения этого персонажа будут удалены с устройства.</p>
          <button className="btn danger" onClick={async () => { if (await deleteCharacter(confirmDel.id)) setConfirmDel(null); }}>Удалить персонажа</button>
          <button className="btn secondary" onClick={() => setConfirmDel(null)}>Отмена</button>
        </Sheet>
      ) : null}
      {draftAsk && draft ? (
        <Sheet title="Продолжить создание?" onClose={() => setDraftAsk(false)}>
          <p className="lead">
            Сохранён черновик персонажа.<br />
            {draft.name.trim() ? <>{draft.name.trim()}<br /></> : null}
            {originLabel(draft.raceId, draft.subraceId) || 'Происхождение не выбрано'}<br />
            Шаг {draft.currentStep} из 7 — {STEP_NAMES[draft.currentStep - 1]}
          </p>
          <button className="btn" onClick={() => nav(`/create/${draft.currentStep}`)}>Продолжить</button>
          <button className="btn secondary" onClick={() => { setDraftAsk(false); setReplaceAsk(true); }}>Создать нового</button>
        </Sheet>
      ) : null}
      {replaceAsk ? (
        <Sheet title="Заменить черновик?" onClose={() => setReplaceAsk(false)}>
          <p className="lead">Текущий черновик будет удалён без возможности восстановления.</p>
          <button className="btn danger" onClick={async () => { if (await discardDraft()) { await startDraft(); nav('/create/1'); } }}>Удалить черновик и начать заново</button>
          <button className="btn secondary" onClick={() => setReplaceAsk(false)}>Отмена</button>
        </Sheet>
      ) : null}
    </>
  );

  return (
    <Screen title="Alones" left={chrome.left} right={chrome.right} footer={<BottomNav />} footerClass="navfoot" overlayChildren={overlays}>
      <ProfileRow />
      <div className="row between">
        <h2 className="title">Персонажи</h2>
        <span className="badge" aria-label={`Создано персонажей: ${characters.length}`}>{characters.length}</span>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <Portrait id="tii_kroner" className="" />
          <h2>Пока нет ни одного<br />персонажа</h2>
          <p className="p">Каждая история начинается<br />с первого героя.</p>
          <button className="btn" onClick={create}>Создать персонажа</button>
        </div>
      ) : (
        <>
          <p className="lead">Твои истории в Элонии</p>
          {list.map((c) => (
            <div key={c.id} className="card charcard">
              <Link to={`/c/${c.id}`} className="open" style={{ color: 'inherit', textDecoration: 'none' }}>
                <Portrait id={c.portraitId} />
                <span className="grow">
                  <b className="clamp2" style={{ display: 'block', fontSize: 15 }}>{c.name}</b>
                  <span className="xs">{originLabel(c.raceId, c.subraceId)}</span>
                </span>
              </Link>
              <button className="iconbtn" aria-label={`Действия: ${c.name}`} onClick={() => setMenuFor(c)}>{Icon.dots}</button>
            </div>
          ))}
          <div className="list-end-spacer" />
        </>
      )}
    </Screen>
  );
}

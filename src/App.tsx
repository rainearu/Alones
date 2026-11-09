import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './store';
import Home from './pages/Home';
import Create from './pages/Create';
import Edit from './pages/Edit';
import {
  CharacterSheet, SheetAddItem, SheetOrderInfo, SheetOrders, SheetOrdersEdit, SheetTechniques, SheetTraits,
} from './pages/CharacterSheet';
import { LoreArticle, LoreIndex, Profile, RuleArticle, RulesIndex } from './pages/Reference';
import { Sheet } from './ui/kit';

function SaveErrorSheet() {
  const err = useStore((s) => s.saveError);
  const dismiss = useStore((s) => s.dismissError);
  if (!err) return null;
  return (
    <Sheet title="Не удалось сохранить" onClose={dismiss}>
      <p className="lead">{err.message}</p>
      <button className="btn" onClick={() => void err.retry()}>Повторить сохранение</button>
      <button className="btn secondary" onClick={dismiss}>Вернуться</button>
    </Sheet>
  );
}

function StorageBanner() {
  const loadError = useStore((s) => s.loadError);
  if (!loadError) return null;
  return <div role="alert" className="notice warn" style={{ margin: 0, borderRadius: 0 }}>{loadError}</div>;
}

export default function App() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  useEffect(() => { void init(); }, [init]);
  return (
    <HashRouter>
      <div className="app">
        <StorageBanner />
        {ready ? (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/create/:step" element={<Create />} />
            <Route path="/create/:step/:sub" element={<Create />} />
            <Route path="/c/:id" element={<CharacterSheet />} />
            <Route path="/c/:id/edit" element={<Edit />} />
            <Route path="/c/:id/orders" element={<SheetOrders />} />
            <Route path="/c/:id/orders/edit" element={<SheetOrdersEdit />} />
            <Route path="/c/:id/order/:orderId" element={<SheetOrderInfo />} />
            <Route path="/c/:id/traits" element={<SheetTraits />} />
            <Route path="/c/:id/techniques" element={<SheetTechniques />} />
            <Route path="/c/:id/add" element={<SheetAddItem />} />
            <Route path="/c/:id/add/:weaponId" element={<SheetAddItem />} />
            <Route path="/lore" element={<LoreIndex />} />
            <Route path="/lore/:articleId" element={<LoreArticle />} />
            <Route path="/rules" element={<RulesIndex />} />
            <Route path="/rules/:articleId" element={<RuleArticle />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : null}
        <SaveErrorSheet />
      </div>
    </HashRouter>
  );
}

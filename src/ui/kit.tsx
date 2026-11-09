import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { img } from '../domain/content';

// ---------- Иконки ----------
const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const Icon = {
  back: svg(<path d="M15 5l-7 7 7 7" />),
  close: svg(<path d="M6 6l12 12M18 6L6 18" />),
  menu: svg(<path d="M4 7h16M4 12h16M4 17h16" />),
  more: svg(<><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></>),
  dots: svg(<><circle cx="12" cy="5" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="19" r="1.4" fill="currentColor" /></>),
  plus: svg(<path d="M12 5v14M5 12h14" />),
  minus: svg(<path d="M5 12h14" />),
  check: svg(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  elf: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M22 28c-2-6-5-5-5-9l5-2-2-3 1-5c-5-8-15-5-14 3l-4-2 3 9 4-2c0 7-4 7-4 11M12 10l2 1" /></svg>,
  planet: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="16" cy="16" r="10" /><ellipse cx="16" cy="16" rx="16" ry="5" transform="rotate(-30 16 16)" /></svg>,
  scroll: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 6h17c5 0 4 7 0 7h-3M8 6c-5 0-5 7 0 7V25h16c5 0 5-7 0-7v-8M8 25c5 0 5-7 0-7M12 11h7M12 15h7" /></svg>,
  item: <svg viewBox="0 0 48 48" fill="none" stroke="#8fa1b1" strokeWidth="2" aria-hidden="true"><rect x="8" y="14" width="32" height="24" rx="4" /><path d="M18 14v-3a3 3 0 013-3h6a3 3 0 013 3v3M8 24h32" /></svg>,
};

// ---------- Каркас экрана ----------
interface HeadBtn { icon: keyof typeof Icon; label: string; onClick: () => void }
export function Screen(props: {
  title: string;
  left?: HeadBtn | 'back' | null;
  right?: HeadBtn | null;
  progress?: number;
  footer?: ReactNode;
  children: ReactNode;
  contentRef?: React.Ref<HTMLElement>;
  overlayChildren?: ReactNode;
  footerClass?: string;
}) {
  const nav = useNavigate();
  const left = props.left === 'back' ? { icon: 'back' as const, label: 'Назад', onClick: () => nav(-1) } : props.left;
  return (
    <div className="screen">
      <header className="head">
        {left ? <button className="iconbtn" aria-label={left.label} onClick={left.onClick}>{Icon[left.icon]}</button> : <span className="iconbtn placeholder" />}
        <h1>{props.title}</h1>
        {props.right ? <button className="iconbtn" aria-label={props.right.label} onClick={props.right.onClick}>{Icon[props.right.icon]}</button> : <span className="iconbtn placeholder" />}
      </header>
      {props.progress ? (
        <div className="progress" role="progressbar" aria-label="Шаги создания" aria-valuemin={1} aria-valuemax={7} aria-valuenow={props.progress} aria-valuetext={`Шаг ${props.progress} из 7`}>
          {Array.from({ length: 7 }, (_, i) => <i key={i} className={i < props.progress! ? 'on' : ''} />)}
        </div>
      ) : null}
      <main className="content" ref={props.contentRef}>{props.children}</main>
      {props.footer ? <footer className={'footer ' + (props.footerClass ?? '')}>{props.footer}</footer> : null}
      {props.overlayChildren}
    </div>
  );
}

export function BottomNav() {
  const items = [
    { to: '/', label: 'Персонажи', icon: Icon.elf },
    { to: '/lore', label: 'Мир и лор', icon: Icon.planet },
    { to: '/rules', label: 'Рулбук', icon: Icon.scroll },
  ];
  return (
    <nav className="nav" aria-label="Разделы">
      {items.map((i) => <NavLink key={i.to} to={i.to} end={i.to === '/'}>{i.icon}{i.label}</NavLink>)}
    </nav>
  );
}

// ---------- Модальные ----------
function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>('input, textarea, button:not([data-skipfocus])')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll<HTMLElement>('button, input, textarea, a[href], [tabindex]')].filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [onClose]);
  return ref;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useModal(onClose);
  const id = useId();
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="handle" />
        <h2 id={id}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useModal(onClose);
  return (
    <div className="overlay drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Меню" ref={ref}>{children}</div>
    </div>
  );
}

// ---------- Мелкие элементы ----------
export const Notice = ({ children, warn }: { children: ReactNode; warn?: boolean }) =>
  <div className={'notice' + (warn ? ' warn' : '')} role={warn ? 'alert' : undefined}>{children}</div>;

export const Check = ({ on }: { on: boolean }) => <span className={'check' + (on ? ' on' : '')} aria-hidden="true">{on ? Icon.check : null}</span>;

export function Stepper(props: { value: number; label: string; onDec: () => void; onInc: () => void; canDec: boolean; canInc: boolean; decHint?: string; incHint?: string; big?: boolean }) {
  return (
    <div className={'stepper' + (props.big ? ' big-stepper' : '')} role="group" aria-label={props.label}>
      <button type="button" aria-label={`Уменьшить: ${props.label}`} title={props.decHint} disabled={!props.canDec} onClick={props.onDec}>{Icon.minus}</button>
      <output aria-live="polite">{props.value}</output>
      <button type="button" aria-label={`Увеличить: ${props.label}`} title={props.incHint} disabled={!props.canInc} onClick={props.onInc}>{Icon.plus}</button>
    </div>
  );
}

/** Изображение с фиксированным размером и запасным образом при ошибке */
export function Art({ src, className, alt = '' }: { src: string; className?: string; alt?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (broken) return <div className={className + ' imgbox'} role={alt ? 'img' : undefined} aria-label={alt || undefined} style={{ display: 'grid', placeItems: 'center' }}>{Icon.item}</div>;
  return <img className={className} src={src} alt={alt} decoding="async" onError={() => setBroken(true)} />;
}

export const Portrait = ({ id, className = 'thumb', alt = '' }: { id: string; className?: string; alt?: string }) =>
  <Art src={img.portrait(id)} className={className} alt={alt} />;

export function Field(props: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
  error?: string | null; help?: string; inputMode?: 'numeric' | 'decimal' | 'text'; maxLength?: number; autoFocus?: boolean;
}) {
  const id = useId();
  const common = {
    id, className: 'input', value: props.value, placeholder: props.placeholder, maxLength: props.maxLength,
    'aria-invalid': props.error ? true : undefined, 'aria-describedby': props.error || props.help ? id + '-d' : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => props.onChange(e.target.value),
    autoFocus: props.autoFocus,
  };
  return (
    <label className="field" htmlFor={id}>
      <span>{props.label}</span>
      {props.multiline ? <textarea {...common} rows={3} /> : <input {...common} inputMode={props.inputMode} />}
      {props.error ? <div className="msg" id={id + '-d'}>{props.error}</div> : props.help ? <div className="help" id={id + '-d'}>{props.help}</div> : null}
    </label>
  );
}

/** Неотрицательное целое из поля ввода; null — пусто или неверно */
export function parseNonNeg(v: string): number | null {
  if (!/^\d+$/.test(v.trim())) return null;
  return Number(v.trim());
}

export function Chips<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => <button key={o.id} type="button" className="chip" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

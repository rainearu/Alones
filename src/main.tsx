import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { faults } from './storage/db';

// Для ручной проверки A14: в консоли браузера выполнить __alones.faults.failWrites = 1
(window as unknown as { __alones: unknown }).__alones = { faults };

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

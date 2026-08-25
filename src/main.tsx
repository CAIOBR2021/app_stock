// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// A ORDEM IMPORTA. Imports ES são avaliados de cima para baixo, e o CSS entra
// na página nessa mesma sequência — em empate de especificidade, ganha o
// último. O Bootstrap tem que vir primeiro para que o design system o
// sobrescreva; com App antes daqui (ele importava styles.css), o
// `body { background: var(--bs-body-bg) }` do tema escuro do Bootstrap vencia
// o nosso e a página ficava com um cinza que não é o da paleta.
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './custom.css';
import './styles.css';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados de estoque mudam por ação do usuário; 30s evita refetches agressivos
      staleTime: 30 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

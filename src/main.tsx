import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept window.fetch to automatically attach authenticated Bearer session token to backend API calls
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = sessionStorage.getItem('staffAuthToken');
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.pathname : input.url);

  if (token && url.startsWith('/api/')) {
    init = init || {};
    const headers = new Headers(init.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    init.headers = headers;
  }

  const res = await originalFetch(input, init);

  // If session expired on a protected staff route, gracefully clear and prompt for sign-in
  if (res.status === 401 && token && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/track') && !window.location.pathname.startsWith('/tv')) {
    sessionStorage.removeItem('staffAuthToken');
    sessionStorage.removeItem('staffAuthenticated');
    window.location.href = '/login';
  }

  return res;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

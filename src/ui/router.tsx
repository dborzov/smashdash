/** Minimal hash router: #/map, #/region/ironhold, #/play/ironhold/boss, ... */
import { useEffect, useState } from 'preact/hooks';

export function currentPath(): string {
  return location.hash.replace(/^#/, '') || '/';
}

export function go(path: string, replace = false): void {
  const url = `#${path}`;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): string[] {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => setPath(currentPath());
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    // A child's <Redirect> may already have moved on before this listener existed (child
    // effects run first on the first render), so catch up.
    on();
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return path.split('/').filter(Boolean);
}

/** Navigates after render (safe to return from a component). */
export function Redirect({ to }: { to: string }) {
  useEffect(() => go(to, true), [to]);
  return null;
}

import { useLayoutEffect, type ReactNode } from 'react';
/** Shared input modality keeps pointer focus quiet and keyboard focus visible. */
export function InteractionProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-ui-input');
    const pointer = () => root.setAttribute('data-ui-input', 'pointer');
    const keyboard = () => root.setAttribute('data-ui-input', 'keyboard');
    pointer();
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
      if (previous === null) root.removeAttribute('data-ui-input');
      else root.setAttribute('data-ui-input', previous);
    };
  }, []);
  return <>{children}</>;
}

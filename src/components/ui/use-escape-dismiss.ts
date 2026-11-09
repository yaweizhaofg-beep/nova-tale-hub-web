import { useLayoutEffect, useRef } from 'react';

const layers: { dismiss: () => void }[] = [];
function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !layers.length) return;
  if (event.isComposing) {
    event.stopImmediatePropagation();
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  layers[layers.length - 1].dismiss();
}

/** Register before passive primitive effects so a fast Escape cannot reach a lower layer. */
export function useEscapeDismiss(open: boolean, onDismiss: () => void) {
  const latest = useRef(onDismiss);
  useLayoutEffect(() => {
    latest.current = onDismiss;
  });
  useLayoutEffect(() => {
    if (!open) return;
    const layer = { dismiss: () => latest.current() };
    if (!layers.length) document.addEventListener('keydown', onEscape, true);
    layers.push(layer);
    return () => {
      const index = layers.indexOf(layer);
      if (index !== -1) layers.splice(index, 1);
      if (!layers.length) document.removeEventListener('keydown', onEscape, true);
    };
  }, [open]);
}

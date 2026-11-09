import { useEscapeDismiss } from './use-escape-dismiss';
import {
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import * as Primitive from '@radix-ui/react-dialog';
import styles from './dialog.module.css';

interface FocusableSurfaceProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}
function returnFocusTarget() {
  if (typeof document === 'undefined' || !(document.activeElement instanceof HTMLElement))
    return null;
  const active = document.activeElement;
  const ownerId = active.closest("[data-ui-popup-owner]")?.getAttribute("data-ui-popup-owner");
  return (ownerId && document.getElementById(ownerId)) || active;
}
function useSurfaceFocus(modal = true, ownerId?: string) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [returnTo] = useState(() => (ownerId ? document.getElementById(ownerId) : null) ?? returnFocusTarget());
  return {
    ref: contentRef,
    onOpenAutoFocus: (event: Event) => {
      event.preventDefault();
      const panel = contentRef.current;
      const preferred = panel?.querySelector<HTMLElement>('[data-ui-autofocus]:not([disabled])');
      if (preferred) preferred.focus({ preventScroll: true });
      else if (panel && !panel.contains(document.activeElement))
        panel.focus({ preventScroll: true });
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      const active = document.activeElement;
      if (!modal && active !== document.body && active !== returnTo) return;
      const surfaces = document.querySelectorAll<HTMLElement>('[data-ui-modal]');
      const topModal = surfaces[surfaces.length - 1];
      if (returnTo?.isConnected && (!topModal || topModal.contains(returnTo))) {
        returnTo.setAttribute('data-ui-focus-return', '');
        returnTo.focus({ preventScroll: true });
      }
    },
  };
}
interface DialogProps extends FocusableSurfaceProps {
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
}
/** Behavior only: page CSS continues to own the existing overlay and dialog geometry. */
export function Dialog({
  label,
  onClose,
  children,
  overlayClassName = "",
  contentClassName = "",
  overlayStyle,
  contentStyle,
}: DialogProps) {
  const focus = useSurfaceFocus();
  useEscapeDismiss(true, onClose);
  return (
    <Primitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className={[styles.overlay, overlayClassName].join(' ')} style={overlayStyle}>
        <Primitive.Content
          {...focus}
          aria-modal="true"
          data-ui-modal
          data-ui-surface
          className={[styles.surface, contentClassName].join(' ')}
          style={contentStyle}
          aria-describedby={undefined}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Primitive.Title className={styles.visuallyHidden}>{label}</Primitive.Title>
          {children}
        </Primitive.Content>
      </div>
    </Primitive.Root>
  );
}

interface PanelProps extends FocusableSurfaceProps {
  id?: string;
  ownerId?: string;
  backdropStyle?: CSSProperties;
  dismissOnOutside?: boolean;
}

export function DismissiblePanel({
  id, label, onClose, children, ownerId, backdropStyle, dismissOnOutside = true,
  contentClassName, contentStyle,
}: PanelProps) {
  const focus = useSurfaceFocus(false, ownerId);
  useEscapeDismiss(true, onClose);
  return (
    <Primitive.Root open modal={false} onOpenChange={(open) => { if (!open) onClose(); }}>
      {backdropStyle && <div aria-hidden style={backdropStyle} />}
      <Primitive.Content
        {...focus}
        id={id}
        className={[styles.surface, contentClassName].filter(Boolean).join(' ')}
        style={contentStyle}
        aria-describedby={undefined}
        onInteractOutside={(event) => {
          const target = event.detail.originalEvent.target;
          if (!dismissOnOutside || (ownerId && target instanceof Node && document.getElementById(ownerId)?.contains(target))) {
            event.preventDefault();
          }
        }}
      >
        <Primitive.Title className={styles.visuallyHidden}>{label}</Primitive.Title>
        {children}
      </Primitive.Content>
    </Primitive.Root>
  );
}

import { useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DropdownMenu, DropdownTrigger, DropdownContent } from './popup';
import styles from './popup.module.css';

/** The transparent backdrop preserves right-click dismissal without locking body scroll. */
export function PointMenu({
  x,
  y,
  label,
  onClose,
  children,
  className,
  style,
}: {
  x: number;
  y: number;
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [returnTo] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const root = document.getElementById('root');
  return (
    <DropdownMenu
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {root &&
        createPortal(
          <div
            className={styles.pointBackdrop}
            aria-hidden
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              onClose();
            }}
          />,
          root,
        )}
      <DropdownTrigger asChild>
        <span
          aria-hidden
          tabIndex={-1}
          className={styles.pointAnchor}
          style={{ left: x, top: y }}
        />
      </DropdownTrigger>
      <DropdownContent
        aria-label={label}
        side="bottom"
        align="start"
        sideOffset={0}
        className={className}
        style={style}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnTo?.isConnected) {
            returnTo.setAttribute('data-ui-focus-return', '');
            returnTo.focus({ preventScroll: true });
          }
        }}
      >
        {children}
      </DropdownContent>
    </DropdownMenu>
  );
}

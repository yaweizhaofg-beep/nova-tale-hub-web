import floating from './floating.module.css';
import { useEscapeDismiss } from './use-escape-dismiss';
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import styles from './popup.module.css';

const OwnerContext = createContext<string>('');
const container = () =>
  typeof document === 'undefined' ? undefined : document.getElementById('root');

function usePopupState({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [local, setLocal] = useState(defaultOpen);
  const open = controlled ?? local;
  const change = (next: boolean) => {
    if (controlled === undefined) setLocal(next);
    onOpenChange?.(next);
  };
  useEscapeDismiss(open, () => change(false));
  return { open, onOpenChange: change };
}

export function DropdownMenu(props: ComponentPropsWithoutRef<typeof MenuPrimitive.Root>) {
  const id = useId();
  const state = usePopupState(props);
  return (
    <OwnerContext.Provider value={id}>
      <MenuPrimitive.Root modal={false} {...props} {...state} />
    </OwnerContext.Provider>
  );
}
export const DropdownTrigger = forwardRef<
  ElementRef<typeof MenuPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof MenuPrimitive.Trigger>
>((props, ref) => {
  const owner = useContext(OwnerContext);
  return <MenuPrimitive.Trigger {...props} id={owner} ref={ref} data-ui-trigger />;
});
export const DropdownContent = forwardRef<
  ElementRef<typeof MenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof MenuPrimitive.Content>
>(({ className, onCloseAutoFocus, ...props }, ref) => {
  const owner = useContext(OwnerContext);
  return (
    <MenuPrimitive.Portal container={container()}>
      <MenuPrimitive.Content
        align="end"
        sideOffset={6}
        collisionPadding={8}
        {...props}
        ref={ref}
        className={[floating.surface, styles.surface, className].filter(Boolean).join(' ')}
        data-ui-popup
        data-ui-popup-owner={owner}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          const modals = document.querySelectorAll('[data-ui-modal]');
          const modal = modals[modals.length - 1];
          if (modal && !modal.contains(document.getElementById(owner))) event.preventDefault();
        }}
      />
    </MenuPrimitive.Portal>
  );
});
export const DropdownItem = forwardRef<
  ElementRef<typeof MenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof MenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Item
    {...props}
    ref={ref}
    className={[floating.item, className].filter(Boolean).join(' ')}
  />
));

export function Popover(props: ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) {
  const id = useId();
  const state = usePopupState(props);
  return (
    <OwnerContext.Provider value={id}>
      <PopoverPrimitive.Root {...props} {...state} />
    </OwnerContext.Provider>
  );
}
export const PopoverTrigger = forwardRef<
  ElementRef<typeof PopoverPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>((props, ref) => {
  const owner = useContext(OwnerContext);
  return <PopoverPrimitive.Trigger {...props} id={owner} ref={ref} data-ui-trigger />;
});
export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, ...props }, ref) => {
  const owner = useContext(OwnerContext);
  return (
    <PopoverPrimitive.Portal container={container()}>
      <PopoverPrimitive.Content
        align="end"
        sideOffset={6}
        collisionPadding={8}
        {...props}
        ref={ref}
        className={[floating.surface, styles.surface, className].filter(Boolean).join(' ')}
        data-ui-popup
        data-ui-popup-owner={owner}
      />
    </PopoverPrimitive.Portal>
  );
});
DropdownTrigger.displayName = 'DropdownTrigger';
DropdownContent.displayName = 'DropdownContent';
DropdownItem.displayName = 'DropdownItem';
PopoverTrigger.displayName = 'PopoverTrigger';
PopoverContent.displayName = 'PopoverContent';

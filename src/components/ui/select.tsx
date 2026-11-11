import { useRef, useState, type CSSProperties } from 'react';
import { Select as Primitive } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import floating from './floating.module.css';
import { useEscapeDismiss } from './use-escape-dismiss';
import styles from './select.module.css';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onValueChange: (value: T) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  id?: string;
  required?: boolean;
  placeholder?: string;
}

// A blank business value can be a selectable option, while null represents a placeholder.
function optionKey(value: string | number) {
  return typeof value + ':' + value;
}

export function Select<T extends string | number>({
  label,
  value,
  options,
  onValueChange,
  className,
  style,
  disabled,
  id,
  required,
  placeholder = '请选择',
}: SelectProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  useEscapeDismiss(open, () => setOpen(false));

  function changeOpen(next: boolean) {
    if (next) {
      // Keep list focus within an enclosing dialog's focus scope.
      setContainer(
        triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ??
          document.getElementById('root'),
      );
    }
    setOpen(next);
  }

  return (
    <Primitive.Root<string>
      open={open}
      onOpenChange={changeOpen}
      value={selected ? optionKey(selected.value) : null}
      modal={false}
      disabled={disabled}
      required={required}
      onValueChange={(next) => {
        const option = options.find((item) => optionKey(item.value) === next);
        if (option && !option.disabled) onValueChange(option.value);
      }}
    >
      <Primitive.Trigger
        ref={triggerRef}
        id={id}
        style={style}
        aria-label={label}
        data-value={String(value)}
        className={[styles.trigger, className].filter(Boolean).join(' ')}
        data-ui-trigger
        data-ui-select
      >
        <span className={styles.labels}>
          <Primitive.Value className={styles.value}>
            {selected?.label ?? placeholder}
          </Primitive.Value>
          {options.map((option) => (
            <span key={optionKey(option.value)} className={styles.sizer} aria-hidden="true">
              {option.label}
            </span>
          ))}
        </span>
        <Primitive.Icon className={styles.chevron} aria-hidden="true">
          <ChevronDown size={12} />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal container={container}>
        <Primitive.Positioner
          alignItemWithTrigger={false}
          align="start"
          sideOffset={6}
          collisionPadding={8}
          positionMethod="fixed"
          className={styles.positioner}
        >
          <Primitive.Popup className={[floating.surface, styles.content].join(' ')} data-ui-popup>
            <Primitive.List aria-label={label} className={styles.list}>
              {options.map((option) => (
                <Primitive.Item
                  key={optionKey(option.value)}
                  value={optionKey(option.value)}
                  label={option.label}
                  disabled={option.disabled}
                  className={[floating.item, styles.option].join(' ')}
                  data-value={String(option.value)}
                >
                  <Primitive.ItemText>{option.label}</Primitive.ItemText>
                  <Primitive.ItemIndicator className={styles.indicator} aria-hidden="true">
                    <Check size={13} />
                  </Primitive.ItemIndicator>
                </Primitive.Item>
              ))}
            </Primitive.List>
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

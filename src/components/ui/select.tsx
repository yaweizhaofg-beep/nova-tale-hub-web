import floating from './floating.module.css';
import { useState, type CSSProperties } from 'react';
import { useEscapeDismiss } from './use-escape-dismiss';
import * as Primitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  useEscapeDismiss(open, () => setOpen(false));
  return (
    <Primitive.Root
      open={open}
      onOpenChange={setOpen}
      value={'option:' + value}
      disabled={disabled}
      required={required}
      onValueChange={(next) => {
        const option = options.find((option) => 'option:' + option.value === next);
        if (option && !option.disabled) onValueChange(option.value);
      }}
    >
      <Primitive.Trigger
        id={id}
        style={style}
        aria-label={label}
        data-value={String(value)}
        className={[styles.trigger, className].filter(Boolean).join(' ')}
        data-ui-trigger
        data-ui-select
      >
        <span className={styles.labels}>
          <Primitive.Value className={styles.value} placeholder={placeholder} />
          {options.map((option) => (
            <span key={option.value} className={styles.sizer} aria-hidden="true">
              {option.label}
            </span>
          ))}
        </span>
        <Primitive.Icon className={styles.chevron}>
          <ChevronDown size={12} />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal
        container={typeof document === 'undefined' ? undefined : document.getElementById('root')}
      >
        <Primitive.Content
          className={[floating.surface, styles.content].join(' ')}
          position="popper"
          sideOffset={6}
          collisionPadding={8}
          data-ui-popup
        >
          <Primitive.ScrollUpButton className={styles.scroll}>
            <ChevronUp size={12} />
          </Primitive.ScrollUpButton>
          <Primitive.Viewport className={styles.viewport}>
            {options.map((option) => (
              <Primitive.Item
                key={option.value}
                value={'option:' + option.value}
                textValue={option.label}
                disabled={option.disabled}
                className={[floating.item, styles.option].join(' ')}
                data-value={String(option.value)}
              >
                <Primitive.ItemText>{option.label}</Primitive.ItemText>
                <Primitive.ItemIndicator className={styles.indicator}>
                  <Check size={13} />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className={styles.scroll}>
            <ChevronDown size={12} />
          </Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

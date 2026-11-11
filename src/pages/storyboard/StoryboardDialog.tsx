import type { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { ModalShell } from '@/components/ui';
import styles from './storyboard-shots.module.css';

export function StoryboardDialog({
  title,
  description,
  headingIcon,
  className,
  width,
  onClose,
  onSubmit,
  actions,
  children,
}: {
  title: string;
  description?: string;
  headingIcon?: ReactNode;
  className?: string;
  width?: number;
  onClose: () => void;
  onSubmit?: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const Container = onSubmit ? 'form' : 'div';
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <ModalShell label={title} onClose={onClose} width={width}>
      <Container
        className={['studio-shell', styles.editor, className].filter(Boolean).join(' ')}
        onSubmit={onSubmit ? submit : undefined}
      >
        <header className={styles.editorHeader}>
          <div className={styles.editorHeading}>
            {headingIcon}
            <div>
              <h2>{title}</h2>
              {description && <p>{description}</p>}
            </div>
          </div>
          <button type="button" className={styles.iconButton} aria-label="关闭" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.editorBody}>{children}</div>
        {actions && <footer className={styles.editorFooter}>{actions}</footer>}
      </Container>
    </ModalShell>
  );
}

export function SaveDialogActions({
  onClose,
  label = '保存',
  disabled = false,
}: {
  onClose: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <>
      <button type="button" className={styles.subtleButton} onClick={onClose}>
        取消
      </button>
      <button type="submit" className={styles.primaryButton} disabled={disabled}>
        {label}
      </button>
    </>
  );
}

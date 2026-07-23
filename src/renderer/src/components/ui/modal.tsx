import { useEffect } from 'react';
import { cn } from '@renderer/lib/utils';

/**
 * Backdrop + panel shell. Closes on backdrop click and on Escape so every modal
 * in the app behaves the same way.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element | null {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="bg-ink/30 animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={cn('animate-in fade-in zoom-in-95 relative duration-200', className)}>
        {children}
      </div>
    </div>
  );
}

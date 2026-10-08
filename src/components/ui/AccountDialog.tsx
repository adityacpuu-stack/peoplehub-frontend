import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';
import './account-dialog.css';
import { registerToastHost } from './toast-host';
import { lockBodyScroll } from './scroll-lock';

const activeDialogs: HTMLDialogElement[] = [];
const focusableElements = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]'))
  .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);

export function AccountDialog({ children, onClose, labelledBy, describedBy, toasterId, clearToastsOnClose = true, role = 'dialog', className = '' }: {
  children: ReactNode; onClose: () => void; labelledBy: string; describedBy?: string; toasterId: string; clearToastsOnClose?: boolean; role?: 'dialog' | 'alertdialog'; className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);

  useLayoutEffect(() => {
    const node = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const unlockScroll = lockBodyScroll();
    node.showModal();
    activeDialogs.push(node);
    // A disabled submit button can leave focus on body after an async action.
    // Recover the next Tab before the browser moves it into its own chrome.
    const recoverFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || activeDialogs.at(-1) !== node || node.contains(document.activeElement)) return;
      event.preventDefault();
      event.stopPropagation();
      const items = focusableElements(node);
      (event.shiftKey ? items.at(-1) ?? node : items[0] ?? node).focus({ preventScroll: true });
    };
    document.addEventListener('keydown', recoverFocus, true);
    const unregisterToast = toasterId === 'default' ? registerToastHost(node) : undefined;
    return () => {
      document.removeEventListener('keydown', recoverFocus, true);
      const index = activeDialogs.indexOf(node);
      if (index !== -1) activeDialogs.splice(index, 1);
      unregisterToast?.();
      node.close();
      unlockScroll();
      if (clearToastsOnClose) toast.removeAll(toasterId);
      queueMicrotask(() => {
        if (previousFocus?.isConnected && previousFocus !== document.body && !node.contains(previousFocus)) {
          previousFocus.focus({ preventScroll: true });
        } else if (document.activeElement === document.body) {
          document.querySelector<HTMLElement>('[data-account-menu-trigger]')?.focus({ preventScroll: true });
        }
      });
    };
  }, [toasterId, clearToastsOnClose]);

  const outside = (event: React.MouseEvent<HTMLDialogElement> | React.PointerEvent<HTMLDialogElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.target === event.currentTarget &&
      (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };

  return createPortal(<dialog ref={dialog} className={'ph-account-dialog ' + className} role={role} aria-labelledby={labelledBy} aria-describedby={describedBy}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key !== 'Tab') return;
      const items = focusableElements(event.currentTarget);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    onPointerDown={event => { backdropPress.current = outside(event); }}
    onClick={event => { if (backdropPress.current && outside(event)) onClose(); backdropPress.current = false; }}>
    {children}
    {toasterId !== 'default' && <Toaster toasterId={toasterId} position="top-center" containerStyle={{ position: 'absolute', top: 12 }}
      toastOptions={{ duration: 4000 }} />}
  </dialog>, document.body);
}

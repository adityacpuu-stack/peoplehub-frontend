import { useSyncExternalStore, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'react-hot-toast';
import { getToastHost, subscribeToastHost } from './toast-host';

export function ApplicationToaster(props: ComponentProps<typeof Toaster>) {
  const host = useSyncExternalStore(subscribeToastHost, getToastHost, () => null);
  return createPortal(<Toaster {...props} toasterId="default"
    position={host ? 'top-center' : props.position}
    containerStyle={host ? { ...props.containerStyle, position: 'absolute', top: 12 } : props.containerStyle} />,
  host ?? document.body);
}

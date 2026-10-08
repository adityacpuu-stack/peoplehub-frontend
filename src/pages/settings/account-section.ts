import type { Ref } from 'react';

// Each form owns its draft/save guard; the shared shell asks before leaving it.
export interface AccountSectionHandle {
  leave: (action: () => void) => void;
}

export interface AccountSectionProps {
  navigationRef: Ref<AccountSectionHandle>;
  onBusyChange: (busy: boolean) => void;
}

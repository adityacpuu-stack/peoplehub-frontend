import { useEffect, useRef, useState } from 'react';

type PendingAction = { scope: string; action: () => void };

// Keep the public navigation callback synchronous. Only an explicit discard can
// run the saved action, and it cannot outlive its form or overwrite another ask.
export function useAccountDiscard(scope: string, busy: boolean) {
  const pending = useRef<PendingAction | null>(null);
  const [requestState, setRequestState] = useState({ scope, open: false });
  // Do not revive an old confirmation when navigating away and back to a scope.
  if (requestState.scope !== scope) setRequestState({ scope, open: false });

  useEffect(() => () => { pending.current = null; }, [scope]);

  const request = (action: () => void) => {
    if (busy || pending.current?.scope === scope) return;
    pending.current = { scope, action };
    setRequestState({ scope, open: true });
  };
  const cancel = () => {
    if (busy) return;
    pending.current = null;
    setRequestState({ scope, open: false });
  };
  const discard = () => {
    const next = pending.current;
    if (busy || !next || next.scope !== scope) return;
    pending.current = null;
    setRequestState({ scope, open: false });
    next.action();
  };

  return { isOpen: requestState.scope === scope && requestState.open, request, cancel, discard };
}

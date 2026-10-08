// One default toaster follows the topmost dialog. Mounting two toasters with the
// same ID can detach the wrong store listener when a dialog closes.
const hosts: HTMLElement[] = [];
const listeners = new Set<() => void>();
export const getToastHost = () => hosts.at(-1) ?? null;
export const subscribeToastHost = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const registerToastHost = (host: HTMLElement) => {
  hosts.push(host);
  listeners.forEach(listener => listener());
  return () => {
    const index = hosts.indexOf(host);
    if (index !== -1) hosts.splice(index, 1);
    listeners.forEach(listener => listener());
  };
};

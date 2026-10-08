import { useEffect, useState } from 'react';

export function useNavigationConfig() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setVersion(value => value + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener('navigation-config-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('navigation-config-changed', refresh);
    };
  }, []);
  return version;
}

import type { ComponentProps } from 'react';
import { LoginDesktop } from './LoginDesktop';

// One responsive form keeps labels, validation and actions consistent on every device.
export function LoginMobile(props: ComponentProps<typeof LoginDesktop>) {
  return <LoginDesktop {...props} />;
}

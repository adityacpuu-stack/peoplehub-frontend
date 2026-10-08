import type { ComponentProps } from 'react';
import { ForgotPasswordDesktop } from './ForgotPasswordDesktop';

// One responsive form keeps labels, validation and actions consistent on every device.
export function ForgotPasswordMobile(props: ComponentProps<typeof ForgotPasswordDesktop>) {
  return <ForgotPasswordDesktop {...props} />;
}

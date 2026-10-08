import type { ComponentProps } from 'react';
import { ResetPasswordDesktop } from './ResetPasswordDesktop';

// One responsive form keeps labels, validation and actions consistent on every device.
export function ResetPasswordMobile(props: ComponentProps<typeof ResetPasswordDesktop>) {
  return <ResetPasswordDesktop {...props} />;
}

import type { MessagePair } from './index';
import { common } from './common';
import { personal } from './personal';
import { attendance } from './attendance';
import { shared } from './shared';
import { errors } from './errors';
import { operations } from './operations';
import { payroll } from './payroll';
import { insights } from './insights';
import { administration } from './administration';
import { leaveResources } from './leaveResources';
import { account } from './account';
import { teamTimeMessages } from '../pages/manager/team-time.catalog';
import { rolesMessages } from '../pages/admin/roles.catalog';
import { leaveExportMessages } from '../pages/leave/leave-export.catalog';
import { permissions } from './permissions';
import { itMessages } from '../pages/it/it.catalog';

export const messages: Record<string, MessagePair> = {
  // First, so existing catalog entries for shared words keep precedence.
  ...permissions,
  // IT workspace copy only fills gaps, like the leave export catalog below.
  ...itMessages,
  // Leave export copy only fills gaps: an existing catalog entry for the same words is never replaced.
  ...leaveExportMessages,
  ...operations,
  ...payroll,
  ...insights,
  ...administration,
  ...leaveResources,
  ...account,
  ...errors,
  ...shared,
  ...attendance,
  ...personal,
  ...common,
  ...teamTimeMessages,
  ...rolesMessages,
  'Language': ['Bahasa', 'Language'],
  'Saving language…': ['Menyimpan bahasa…', 'Saving language…'],
  'Could not save language. Please try again.': ['Bahasa gagal disimpan. Silakan coba lagi.', 'Could not save language. Please try again.'],
};

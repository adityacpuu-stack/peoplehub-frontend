import { t } from './index';
import { errors } from './errors';

type Parameter = readonly [name: string, pattern: string];
type KnownTemplate = readonly [source: string, parameters: readonly Parameter[]];

// Parameters are copied verbatim: no Number conversion, rounding, date parsing,
// enum relabeling, recursive translation, or interpretation of replacement tokens.
const number = '-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?';
const date = '\\d{4}-\\d{2}-\\d{2}';
const probationDate = '\\d{1,2} (?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) \\d{4}';
const permission = '[A-Za-z0-9_.:*\\-]+';
const role = '[A-Za-z][A-Za-z ]*';
const payrollState = 'draft|validated|submitted|approved|rejected|paid';
const templates: KnownTemplate[] = [
  ['Insufficient leave balance. Available: {days} days', [['days', number]]],
  ['Minimum {days} days required per request', [['days', number]]],
  ['Maximum {days} days allowed per request', [['days', number]]],
  ['Account is locked. Try again in {minutes} minutes.', [['minutes', '\\d+']]],
  ['Account locked due to too many failed attempts. Try again in {minutes} minutes.', [['minutes', '\\d+']]],
  ['Employee is still on probation until {date}. Leave requests are not allowed during probation.', [['date', probationDate]]],
  ['These dates overlap with a leave request ({status}) from {from} to {to}', [['status', 'pending|approved'], ['from', date], ['to', date]]],
  // Company names may contain punctuation, quotes, newlines, or template-looking
  // text. Only the confirmed surrounding sentence is translated, never its value.
  ['Company "{company}" has no email domain configured.', [['company', '[\\s\\S]+']]],
  ['Email {email} is already used by another user.', [['email', '[^\\s@]+@[^\\s@]+']]],
  ['Access denied. Required permissions: {permissions}', [['permissions', `${permission}(?: OR ${permission})*`]]],
  ['Access denied. Missing permissions: {permissions}', [['permissions', `${permission}(?:, ${permission})*`]]],
  ['Access denied. Required permission pattern: {pattern}', [['pattern', permission]]],
  ['Access denied. Required roles: {roles}', [['roles', `${role}(?:, ${role})*`]]],
  ['Access denied. Minimum role required: {role}', [['role', role]]],
  ['Unrecognized upload field: {field}', [['field', '[A-Za-z0-9_.\\[\\]\\-]+']]],
  ['Route {method} {url} not found', [['method', 'GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS|CONNECT|TRACE'], ['url', '/[^\\s]+']]],
  ['Payroll {id}: Not found', [['id', '\\d+']]],
  ['Payroll {id}: Can only submit draft or validated payrolls (current: {status})', [['id', '\\d+'], ['status', payrollState]]],
  ['Payroll {id}: Can only approve submitted payrolls (current: {status})', [['id', '\\d+'], ['status', payrollState]]],
  ['Payroll {id}: Can only reject submitted payrolls (current: {status})', [['id', '\\d+'], ['status', payrollState]]],
  ['PFI payroll template not found at {path}', [['path', '[^\\r\\n]+(?:/|\\\\)pfi-payroll-template\\.xlsx']]],
];

const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Compile only the allowlisted full templates, in both source languages. No
// generic "{resource} not found" or "{field} is required" matcher is permitted.
const patterns = templates.flatMap(([source, parameters]) => errors[source].map(template => {
  const names: string[] = [];
  let pattern = '', end = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    pattern += escapePattern(template.slice(end, match.index));
    const parameter = parameters.find(([name]) => name === match[1]);
    if (!parameter) throw new Error(`Missing error translation parameter: ${match[1]}`);
    pattern += `(${parameter[1]})`;
    names.push(parameter[0]);
    end = match.index! + match[0].length;
  }
  pattern += escapePattern(template.slice(end));
  // Unlike $, (?![\s\S]) cannot match before an unexpected trailing newline.
  return { pattern: new RegExp(`^${pattern}(?![\\s\\S])`), source, names };
}));

/** Known server-authored templates only; unrecognized diagnostics retain their exact cause. */
export function translateError(source: string): string {
  // The general catalog also contains names of UI actions. Those alone do not
  // establish that an arbitrary server diagnostic is known application copy.
  if (Object.prototype.hasOwnProperty.call(errors, source)) return t(source);
  for (const { pattern, source: template, names } of patterns) {
    const match = source.match(pattern);
    if (match) return t(template, Object.fromEntries(names.map((name, index) => [name, match[index + 1]])));
  }
  return source;
}

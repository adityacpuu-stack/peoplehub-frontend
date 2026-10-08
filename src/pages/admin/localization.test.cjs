// Run locally: node --test src/pages/admin/localization.test.cjs
// Uses application source and synthetic values only; no server, account, or secrets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const domains = ['admin', 'companies', 'departments', 'positions', 'work-locations', 'holiday-calendar'];
const sources = domains.flatMap(domain => fs.readdirSync(path.join(root, 'pages', domain))
  .filter(name => name.endsWith('.tsx'))
  .map(name => path.join(root, 'pages', domain, name)));
const read = file => fs.readFileSync(file, 'utf8');
function evaluate(file, dependencies = {}) {
  const exports = {};
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { exports, require: name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const { administration } = evaluate(path.join(root, 'i18n/administration.ts'));
const { common } = evaluate(path.join(root, 'i18n/common.ts'));
// Other catalogs registered in i18n/messages.ts that administration pages use
// (role-management copy and action-permission copy). Same precedence as the app:
// permissions first, administration/common override, roles catalog last.
const { permissions } = evaluate(path.join(root, 'i18n/permissions.ts'));
const { rolesMessages } = evaluate(path.join(__dirname, 'roles.catalog.ts'));
const messages = { ...permissions, ...common, ...administration, ...rolesMessages };
const { t, setLocale, intlLocale } = evaluate(path.join(root, 'i18n/index.ts'), {
  react: { useSyncExternalStore() {} },
  './messages': { messages },
});
const labels = evaluate(path.join(__dirname, 'localization.ts'), { '@/i18n': { t } });
const parse = file => ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function visit(node, fn) { fn(node); ts.forEachChild(node, child => visit(child, fn)); }

test('all direct and conditional translation sources in administration have bilingual entries', () => {
  const missing = new Set();
  let checked = 0;
  function check(node) {
    if (ts.isStringLiteral(node)) {
      if (node.text.trim()) { checked++; if (!messages[node.text]) missing.add(node.text); }
    } else if (ts.isConditionalExpression(node)) { check(node.whenTrue); check(node.whenFalse); }
  }
  for (const file of sources) {
    const ast = parse(file);
    visit(ast, node => {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && node.arguments[0]) check(node.arguments[0]);
    });
  }
  assert.ok(checked > 600, `Expected full administration scope, saw ${checked} calls`);
  assert.deepEqual([...missing], []);
});

test('every administration pair preserves template parameters and has explicit translations', () => {
  const params = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [source, pair] of Object.entries({ ...administration, ...permissions, ...rolesMessages })) {
    assert.equal(pair.length, 2, source);
    assert.ok(pair[0] && pair[1], source);
    assert.deepEqual(params(pair[0]), params(pair[1]), source);
    assert.deepEqual(params(source), params(pair[0]), source);
  }
});

test('static menu, feature, tab, summary, and permission label configurations are covered', () => {
  const missing = new Set();
  const check = source => { if (source.trim() && !messages[source]) missing.add(source); };
  for (const file of sources) {
    const ast = parse(file);
    visit(ast, node => {
      if (ts.isPropertyAssignment(node) && ['label', 'section', 'title'].includes(node.name.getText(ast)) && ts.isStringLiteral(node.initializer)) check(node.initializer.text);
      if (ts.isVariableDeclaration(node) && ['MONTHS', 'dayNames', 'MODELS', 'GROUP_LABELS', 'featureNames'].includes(node.name.getText(ast)) && node.initializer) {
        visit(node.initializer, item => {
          if (ts.isStringLiteral(item) && !(ts.isPropertyAssignment(item.parent) && item.parent.name === item)) check(item.text);
        });
      }
    });
  }
  const helpers = parse(path.join(__dirname, 'localization.ts'));
  visit(helpers, node => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) check(node.initializer.text);
  });
  assert.deepEqual([...missing], []);
});

test('display identifiers change languages while custom names and descriptions remain unchanged', () => {
  setLocale('id');
  assert.equal(labels.roleLabel('HR Staff'), 'Staf SDM');
  assert.equal(labels.companyTypeLabel('subsidiary'), 'Anak Perusahaan');
  assert.equal(labels.holidayTypeLabel('cuti_bersama'), 'Cuti Bersama');
  assert.equal(labels.permissionLabel('employee.view', 'View employee list and details'), 'Lihat daftar dan detail karyawan');
  assert.equal(labels.roleLabel('Custom audit team'), 'Custom audit team');
  assert.equal(labels.companyTypeLabel('Custom structure'), 'Custom structure');
  assert.equal(labels.permissionLabel('employee.view', 'Private custom description'), 'Private custom description');
  assert.equal(labels.permissionLabel('custom.view', 'Leave'), 'Leave');
  setLocale('en');
  assert.equal(labels.roleLabel('HR Staff'), 'HR Staff');
  assert.equal(labels.holidayTypeLabel('cuti_bersama'), 'Collective Leave');
  assert.equal(labels.auditActionLabel('login_failed'), 'Login failed');
  assert.equal(labels.auditActionLabel('custom_action'), 'custom_action');
  assert.equal(t('Credentials sent to {email}', { email: 'Leave@example.test' }), 'Credentials sent to Leave@example.test');
  setLocale('id');
  assert.equal(t('Credentials sent to {email}', { email: 'Leave@example.test' }), 'Kredensial dikirim ke Leave@example.test');
});

test('localized numbers retain precision and audit dates retain WIB', () => {
  setLocale('id');
  assert.equal((1234.5).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '1.234,50');
  setLocale('en');
  assert.equal((1234.5).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '1,234.50');
  const audit = read(path.join(__dirname, 'AuditLogsPage.tsx'));
  assert.match(audit, /timeZone: 'Asia\/Jakarta'/);
  const calendar = read(path.join(root, 'pages/holiday-calendar/HolidayCalendarPage.tsx'));
  assert.ok(calendar.includes('`${dateStr}T00:00:00`'));
});

test('locale changes do not translate keys, form values, routes, or freeze module labels', () => {
  for (const file of sources) {
    const ast = parse(file);
    visit(ast, node => {
      if (ts.isJsxAttribute(node) && ['key', 'value', 'name', 'href', 'to'].includes(node.name.getText(ast))) {
        assert.doesNotMatch(node.getText(ast), /\bt\(/, `${file}: ${node.getText(ast)}`);
      }
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 't') {
        let parent = node.parent;
        while (parent && !ts.isFunctionLike(parent)) parent = parent.parent;
        assert.ok(parent, `Frozen module-scope translation: ${file}: ${node.getText(ast)}`);
      }
    });
  }
  const users = read(path.join(__dirname, 'UsersPage.tsx'));
  assert.ok(users.includes('role_ids: formData.role_ids'));
  assert.ok(users.includes('userService.sendCredentials(credentialModal.user.id, credentialUsername || undefined, credentialLicenseSkuId || undefined)'));
});

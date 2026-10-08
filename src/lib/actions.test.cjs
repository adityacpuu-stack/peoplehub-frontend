// Run locally: node --test src/lib/actions.test.cjs
// Pure checks of the client permission helper with synthetic users only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, 'actions.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const actions = {};
vm.runInNewContext(js, { exports: actions, require: name => { throw new Error(`Unexpected dependency: ${name}`); } });

const user = (roles, extra = {}) => ({ id: 1, roles, employee: { id: 500 }, ...extra });

test('effectiveActions undefined keeps legacy role-only behaviour', () => {
  assert.equal(actions.canAction(user(['HR Staff']), 'employee.update'), true);
  assert.equal(actions.canAction(user(['HR Staff'], { effectiveActions: undefined }), 'payroll.view'), true);
});

test('an empty list denies every covered action', () => {
  for (const key of actions.ACTION_KEYS) assert.equal(actions.canAction(user(['HR Manager'], { effectiveActions: [] }), key), false);
});

test('malformed present values fail closed', () => {
  for (const effectiveActions of [null, 'employee.view', {}, [1], ['employee.view', null], 0, false]) {
    assert.equal(actions.canAction(user(['HR Manager'], { effectiveActions }), 'employee.view'), false, JSON.stringify(effectiveActions));
  }
});

test('exact membership only; Super Admin always passes', () => {
  const hr = user(['HR Staff'], { effectiveActions: ['employee.view'] });
  assert.equal(actions.canAction(hr, 'employee.view'), true);
  assert.equal(actions.canAction(hr, 'employee.update'), false);
  assert.equal(actions.canAction(user(['Super Admin'], { effectiveActions: [] }), 'payroll.pay'), true);
  assert.equal(actions.canAction(user(['Super Admin'], { effectiveActions: null }), 'payroll.pay'), true);
  assert.equal(actions.canAction(null, 'employee.view'), false);
});

test('employee detail follows the endpoint role ceiling; own record is always open', () => {
  const finance = user(['Finance Manager'], { effectiveActions: ['employee.view'] });
  assert.equal(actions.canOpenEmployee(finance, 901), false);
  assert.equal(actions.canOpenEmployee(finance, 500), true);
  assert.equal(actions.canOpenEmployee(user(['Tax Staff']), 901), false);
  assert.equal(actions.canOpenEmployee(user(['Manager'], { effectiveActions: ['employee.view'] }), 901), true);
  assert.equal(actions.canOpenEmployee(user(['Manager'], { effectiveActions: [] }), 901), false);
});

test('edit entry needs edit role, detail read and update', () => {
  assert.equal(actions.canEditEmployee(user(['HR Staff'], { effectiveActions: ['employee.view', 'employee.update'] })), true);
  assert.equal(actions.canEditEmployee(user(['HR Staff'], { effectiveActions: ['employee.update'] })), false);
  assert.equal(actions.canEditEmployee(user(['Finance Manager'])), false);
  assert.equal(actions.canEditEmployee(user(['Group CEO'])), false);
});

test('covered route mapping', () => {
  // Arrays come from the vm realm; copy into this realm before deep comparison.
  assert.deepEqual(Array.from(actions.routeActions('/employees/901/edit')), ['employee.update']);
  assert.deepEqual(Array.from(actions.routeActions('/employees/create')), ['employee.create']);
  assert.equal(actions.routeActions('/payroll-settings'), null);
  assert.equal(actions.canOpenPath(user(['HR Staff'], { effectiveActions: [] }), '/payroll'), false);
  assert.equal(actions.canOpenPath(user(['HR Staff'], { effectiveActions: [] }), '/my-leave'), true);
});

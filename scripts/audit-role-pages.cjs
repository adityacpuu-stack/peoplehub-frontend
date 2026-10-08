// Read-only source inventory. Does not load application code, env files or data.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src');
const project = path.dirname(root);
const normalize = value => value.replaceAll('\\', '/');
const relative = file => normalize(path.relative(project, file));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
function parse(file) {
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function visit(node, fn) { fn(node); ts.forEachChild(node, child => visit(child, fn)); }
function line(node, file) { return file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1; }
function unwrap(node) {
  while (node && (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isJsxExpression(node))) node = node.expression;
  return node;
}
function literal(node) {
  node = unwrap(node);
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  return undefined;
}
const app = parse(path.join(source, 'App.tsx'));
const arrays = new Map();
const components = new Map();
const barrel = parse(path.join(source, 'pages/index.ts'));
visit(barrel, node => {
  if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
    const target = literal(node.moduleSpecifier);
    if (!target) return;
    const file = path.resolve(source, 'pages', `${target}.tsx`);
    if (fs.existsSync(file)) for (const name of node.exportClause.elements) components.set(name.name.text, relative(file));
  }
});
visit(app, node => {
  if (ts.isVariableDeclaration(node)) {
    const value = literal(node.initializer);
    if (Array.isArray(value)) arrays.set(node.name.getText(app), value);
    if (node.initializer) visit(node.initializer, inner => {
      if (ts.isCallExpression(inner) && inner.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const target = literal(inner.arguments[0]);
        if (target?.startsWith('@/pages/')) components.set(node.name.getText(app), `frontend/src/${target.slice(2)}.tsx`);
      }
    });
  }
});
const wrappers = new Map();
visit(app, node => {
  if (!ts.isFunctionDeclaration(node) || !node.name?.text.endsWith('Wrapper')) return;
  const files = [];
  visit(node, child => {
    if (ts.isJsxSelfClosingElement(child) || ts.isJsxOpeningElement(child)) {
      const file = components.get(child.tagName.getText(app));
      if (file) files.push(file);
    }
  });
  wrappers.set(node.name.text, files);
});
const routes = [];
visit(app, node => {
  if (!ts.isJsxSelfClosingElement(node) && !ts.isJsxOpeningElement(node)) return;
  if (node.tagName.getText(app) !== 'Route') return;
  const attrs = new Map(node.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.getText(app), a.initializer]));
  const routePath = literal(attrs.get('path'));
  if (!routePath) return;
  const tags = [];
  let allowedRoles = null;
  let redirect = null;
  const element = attrs.get('element');
  if (element) visit(element, child => {
    if (!ts.isJsxSelfClosingElement(child) && !ts.isJsxOpeningElement(child)) return;
    const name = child.tagName.getText(app);
    tags.push(name);
    for (const attr of child.attributes.properties.filter(ts.isJsxAttribute)) {
      if (name === 'RoleRoute' && attr.name.getText(app) === 'allowedRoles') {
        const value = unwrap(attr.initializer);
        allowedRoles = literal(value) ?? arrays.get(value?.getText(app)) ?? ['UNRESOLVED'];
      }
      if (name === 'Navigate' && attr.name.getText(app) === 'to') redirect = literal(attr.initializer);
    }
  });
  routes.push({ path: routePath, line: line(node, app), components: tags.filter(t => !['RoleRoute', 'Navigate'].includes(t)),
    files: [...new Set(tags.flatMap(t => wrappers.get(t) || [components.get(t)]).filter(Boolean))], allowedRoles,
    guard: allowedRoles === null ? 'No explicit role gate in route; inspect wrapper/backend' : 'RoleRoute; Super Admin bypass', redirect });
});

const services = {};
for (const file of walk(path.join(source, 'services')).filter(f => f.endsWith('.ts'))) {
  const ast = parse(file);
  visit(ast, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const verb = node.expression.name.text;
    const client = node.expression.expression.getText(ast);
    if (!['api', 'axios'].includes(client) || !['get', 'post', 'put', 'patch', 'delete'].includes(verb)) return;
    let owner = node.parent;
    while (owner && !ts.isPropertyAssignment(owner) && !ts.isMethodDeclaration(owner)) owner = owner.parent;
    if (!owner) return;
    const method = owner.name.getText(ast);
    let container = owner.parent;
    while (container && !ts.isVariableDeclaration(container) && !ts.isClassDeclaration(container)) container = container.parent;
    const service = container?.name?.getText(ast) || path.basename(file, '.ts');
    const key = `${service}.${method}`;
    (services[key] ||= []).push({ method: verb.toUpperCase(), url: literal(node.arguments[0]) ?? node.arguments[0]?.getText(ast), file: relative(file), line: line(node, ast) });
  });
}
const pages = [];
const pageImports = new Map();
for (const file of walk(path.join(source, 'pages')).filter(f => f.endsWith('.tsx'))) {
  const ast = parse(file);
  const calls = new Set();
  const links = [];
  const signals = [];
  const imports = [];
  visit(ast, node => {
    if (ts.isImportDeclaration(node)) {
      const target = literal(node.moduleSpecifier);
      if (target?.startsWith('.') || target?.startsWith('@/pages/')) {
        const resolved = target.startsWith('@/') ? path.resolve(source, target.slice(2)) : path.resolve(path.dirname(file), target);
        if (fs.existsSync(`${resolved}.tsx`)) imports.push(relative(`${resolved}.tsx`));
      }
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const call = node.expression.getText(ast);
      if (ts.isIdentifier(node.expression.expression) && /Service$/i.test(node.expression.expression.text)) calls.add(call);
      if (call === 'Math.random') signals.push({ kind: 'random-data', line: line(node, ast) });
    }
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'setTimeout') signals.push({ kind: 'timer-review', line: line(node, ast) });
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(ast) === 'PreviewBanner') signals.push({ kind: 'preview-disclosure', line: line(node, ast) });
    if (ts.isJsxAttribute(node) && ['to', 'href'].includes(node.name.getText(ast))) {
      const value = literal(node.initializer);
      if (value?.startsWith('/')) links.push({ path: value, line: line(node, ast) });
    }
  });
  const page = relative(file);
  pageImports.set(page, imports);
  pages.push({ file: page, routes: routes.filter(r => r.files.includes(page)).map(r => r.path), calls: [...calls],
    api: [...calls].flatMap(call => services[call] || []), signals, links,
    evidence: 'Source inventory only; signals need human verification, not automatic bug verdicts' });
}
for (const page of pages) {
  page.importedBy = [...pageImports].filter(([, imports]) => imports.includes(page.file)).map(([parent]) => parent);
}
function reachableRoutes(file, visited = new Set()) {
  if (visited.has(file)) return [];
  visited.add(file);
  const page = pages.find(item => item.file === file);
  return page ? [...new Set([...page.routes, ...page.importedBy.flatMap(parent => reachableRoutes(parent, visited))])] : [];
}
for (const page of pages) page.possibleRoutes = reachableRoutes(page.file);
const backend = [];
for (const file of walk(path.join(project, 'backend/src/modules')).filter(f => f.endsWith('.routes.ts'))) {
  const ast = parse(file);
  visit(ast, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.expression.getText(ast) !== 'router') return;
    const method = node.expression.name.text;
    if (!['get', 'post', 'put', 'patch', 'delete', 'use'].includes(method)) return;
    backend.push({ file: relative(file), line: line(node, ast), method, path: literal(node.arguments[0]) ?? null,
      handlers: node.arguments.slice(literal(node.arguments[0]) === undefined ? 0 : 1).map(a => a.getText(ast)) });
  });
}
const sidebar = parse(path.join(source, 'components/layout/Sidebar.tsx'));
const menuLinks = [];
visit(sidebar, node => {
  if (ts.isPropertyAssignment(node) && node.name.getText(sidebar) === 'path') {
    const value = literal(node.initializer);
    if (value) menuLinks.push({ path: value, line: line(node, sidebar), routeExists: routes.some(r => r.path === value) });
  }
});
const inventory = { generatedAt: new Date().toISOString(), boundary: 'Local static source inventory; no employee records or production access.',
  pages, routes, menuLinks, services, backend };
const output = path.join(project, 'ROLE-PAGE-INVENTORY-2026-09-13.json');
fs.writeFileSync(output, JSON.stringify(inventory, null, 2) + '\n');
const md = [
  '# Inventaris halaman dan route PeopleHub', '',
  'Snapshot source lokal, audit 13–14 September 2026. Daftar lengkap ini bukan hasil acceptance test semua fungsi. Import graph menunjukkan route yang mungkin merender komponen; pilihan role di dalam wrapper tetap perlu dibaca.', '',
  `${pages.length} file TSX di pages; ${routes.length} deklarasi Route; ${backend.length} deklarasi route/middleware backend. Tidak membaca data karyawan atau produksi.`, '',
  '## Seluruh halaman/komponen', '',
  'Panggilan service adalah metadata source, termasuk helper lokal. Nol panggilan tidak otomatis berarti data palsu: komponen dapat menerima props, auth store, atau form callbacks. Sinyal timer bukan vonis bug.', '',
  '| File | Route langsung/induk yang mungkin | Panggilan service | Sinyal review |',
  '| --- | --- | --- | --- |',
  ...pages.map(page => `| [${page.file.replace('frontend/src/pages/', '')}](${page.file}) | ${page.possibleRoutes.join(', ') || 'Tidak terpetakan melalui direct import; periksa barrel/wrapper'} | ${page.calls.length} | ${page.signals.map(s => `${s.kind} L${s.line}`).join(', ') || '—'} |`), '',
  '## Seluruh route dan gate eksplisit frontend', '',
  'Super Admin melewati RoleRoute. Gate di bawah hanya bagian frontend; bukan matriks izin backend, akses mutasi, ekspor, atau antarperusahaan. Public/auth/wrapper dan personal linkage dicatat terpisah.', '',
  '| Route | Komponen / redirect | Gate eksplisit di element |', '| --- | --- | --- |',
  ...routes.map(route => `| ${route.path} | ${route.redirect ? `→ ${route.redirect}` : route.components.join(', ')} | ${route.allowedRoles ? route.allowedRoles.length ? route.allowedRoles.join(', ') : 'Super Admin saja' : route.components.includes('PersonalRoute') ? 'Akun login + employee terkait; toggle fitur bila dikonfigurasi' : ['/login', '/forgot-password', '/reset-password', '/403'].includes(route.path) ? 'Public/auth flow' : 'Tidak ada RoleRoute pada element; periksa ProtectedRoute/wrapper/API'} |`), '',
  'Detail endpoint/service dan middleware backend beserta file/line tersedia pada [JSON inventory](ROLE-PAGE-INVENTORY-2026-09-13.json). Kesimpulan manusia dan prioritas ada di [laporan audit](AUDIT-ROLE-PAGES-2026-09-13.md).', '',
];
fs.writeFileSync(path.join(project, 'ROLE-PAGE-INVENTORY-2026-09-13.md'), md.join('\n'));
console.log(JSON.stringify({ pages: pages.length, routes: routes.length, backendRouteDeclarations: backend.length,
  missingSidebarRoutes: menuLinks.filter(l => !l.routeExists), flaggedPages: pages.filter(p => p.signals.length).map(p => ({ file: p.file, signals: p.signals })),
  output: relative(output) }, null, 2));

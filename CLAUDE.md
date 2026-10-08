# PeopleHub Frontend - Developer Guide

## UI language (EN / ID, local 2026-09-29)

Application copy uses `t(source, parameters?)` from `@/i18n`, with explicit registered domain catalogs. Components using it subscribe via `useLocale()`; translated memoized results depend on that locale. Translate at render/action time, not module initialization. Store source keys/parameters for feedback that stays visible across a language switch. `intlLocale()` selects display formatting while existing currency, precision and date/WIB semantics must remain unchanged.

Do not translate route/role/permission comparisons, form option values, React keys, employee/company names or arbitrary user/API content. Custom messages remain original unless a confirmed system template matches. The shared EN/ID control saves `/users/me/language`; this is separate from notification preferences. See `../docs/features/LOCALIZATION-EN-ID-2026-09-29.md` and the catalog/role/browser checks under `../.analysis/i18n/`.

> Current local work/handoff (2026-09-13): read [../PROGRESS.md](../PROGRESS.md) and [../ROLE-FEATURE-PLAN.md](../ROLE-FEATURE-PLAN.md). They distinguish verified local changes from deployment and unresolved audit findings.

> Documentation navigation refreshed 2026-10-07: [workspace index](../docs/README.md), [workspace instructions](../AGENTS.md), [current progress](../PROGRESS.md), and [backend guide](../backend/CLAUDE.md). Historical runbook/backlog files from the old checkout are not present here.

## Quick Start

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

Local startup and health checks: see [Docker local guide](../docs/operations/DOCKER-LOCAL.md). Deployment is a separate, explicitly authorized operation.

## Tech Stack

| Category | Tool |
|----------|------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Routing | React Router DOM 7 |
| State | Zustand 5 (auth + sidebar stores) |
| Forms | React Hook Form 7 + Zod 4 |
| HTTP | Axios (with interceptors) |
| Styling | Tailwind CSS 4 + Tailwind Merge |
| Icons | Lucide React |
| Toast | React Hot Toast |
| Charts | Recharts |
| Monitoring | Sentry (DSN wired — see env section) |

## Project Structure

```
src/
├── App.tsx                # Router setup, role-based routing, lazyNamed helpers
├── main.tsx               # Entry point + Sentry init
├── index.css              # Tailwind config + CSS variables
├── pages/                 # 28 feature page folders + index.ts barrel
│   ├── auth/              # Login, ForgotPassword, ResetPassword
│   ├── dashboard/         # Employee & CEO dashboards
│   ├── employees/         # Employee CRUD, detail, form
│   ├── admin/             # Company, Users, Roles, Audit, CompanyAssignments
│   ├── ceo/               # CEO reports & analytics
│   ├── payroll/           # Payroll processing (PFI Excel export 6-sheet)
│   ├── attendance/        # Attendance tracking
│   ├── leave/             # Leave management
│   ├── contracts/         # Employee contracts
│   ├── performance/       # Performance reviews
│   └── ...                # 18+ more module folders
├── components/
│   ├── ui/                # Reusable UI (Button, Input, Modal, Table, etc.)
│   ├── layout/            # Layout, Header, Sidebar
│   ├── auth/              # ProtectedRoute
│   └── profile/           # ProfileCompletion, PasswordChange modals
├── services/              # API service layer (34 files = 33 services + index.ts barrel)
│   ├── api.ts             # Axios instance + interceptors
│   ├── auth.service.ts
│   ├── employee.service.ts
│   └── ...
├── stores/                # Zustand stores
│   ├── auth.store.ts      # User, token, auth state
│   └── sidebar.store.ts   # Sidebar open/collapsed
├── types/
│   └── index.ts           # Centralized TypeScript types
├── hooks/
│   └── useIsMobile.ts     # Responsive breakpoint hook
└── lib/
    └── utils.ts           # formatDate, formatCurrency, cn, etc.
```

## Code Conventions

### Import Paths
Use `@/` alias for `src/` imports:
```typescript
import { Button } from '@/components/ui';
import { employeeService } from '@/services';
import { useAuthStore } from '@/stores/auth.store';
```

### Pages
- One page = one file in `src/pages/<module>/`
- Data fetching via `useState` + `useEffect` (no React Query / SWR hooks)
- Loading states: `isLoading` boolean + Spinner component
- Debounced search: `useRef` + `setTimeout` pattern

```typescript
// Standard page pattern
const [data, setData] = useState<Employee[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetch = async () => {
    setIsLoading(true);
    try {
      const res = await employeeService.getAll(params);
      setData(res.data);
    } catch (err) {
      // Axios interceptor handles toast
    } finally {
      setIsLoading(false);
    }
  };
  fetch();
}, [page, companyId]);
```

#### Lazy-loaded pages — named export pattern

`App.tsx` uses a `lazyNamed()` helper for code-splitting non-default exports. If a page uses **named export** (`export const FooPage = ...`), it MUST be wrapped with `lazyNamed`, NOT raw `React.lazy()`. Skipping this triggers React error #306 ("Element type is invalid").

Reference fix: **CompanyAssignmentsPage** — was crashing on prod with #306 because it lives behind a named export; migrating to the `lazyNamed` route descriptor restored it. Pattern dipakai untuk semua admin pages baru.

### Services
- One service per module in `src/services/`
- All methods return typed promises
- Axios interceptor handles auth errors globally
- **Meta → pagination transform** dilakukan di service layer (BE returns `meta`, FE consumes `pagination`)

```typescript
export const employeeService = {
  getAll: async (params?: EmployeeListParams): Promise<PaginatedResponse<Employee>> => {
    const response = await api.get('/employees', { params });
    return response.data;
  },
  getById: async (id: number): Promise<Employee> => {
    const response = await api.get(`/employees/${id}`);
    return response.data.data;
  },
  create: async (data: CreateEmployeeRequest): Promise<Employee> => {
    const response = await api.post('/employees', data);
    return response.data.data;
  },
};
```

### Forms
- React Hook Form + Zod validation
- `zodResolver` for schema → form integration
- Wave 5 migrasi RHF kelar untuk: **ProfilePage**, **LeaveRequestsPage**, **EmployeeFormPage**, **Resign modal**. Kalau nemu form lama yang masih controlled-input full-state, itu sisa legacy — boleh dimigrasi pakai pattern di bawah.

```typescript
const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
});
type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### UI Components
Custom components in `src/components/ui/` (NOT shadcn):

| Component | Variants |
|-----------|----------|
| `Button` | primary, secondary, destructive, outline, ghost, link + size sm/md/lg/icon |
| `Input` | With label, error, helperText |
| `Modal` | Portal-based, size variants, Escape key close |
| `Table` | TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty |
| `Card` | CardHeader, CardTitle, CardContent |
| `Badge` | Status color variants |
| `Select` | Native select wrapper |
| `SearchableSelect` | Custom dropdown with search + filter |
| `Avatar` | Initials-based |
| `Spinner` | Loading indicator |
| `ErrorModal` | Network vs auth error distinction |

### State Management (Zustand)
- `useAuthStore` — user, token, isAuthenticated, login/logout/checkAuth
- `useSidebarStore` — isOpen, isCollapsed, toggle
- Both persisted to localStorage

### Auth Flow
1. App mount → `checkAuth()` → verify token via `/auth/me`
2. `ProtectedRoute` wrapper for authenticated pages
3. Forced modals: password change → profile completion
4. Role-based routing: CEO gets different dashboard (+ `/403` page for blocked routes)
5. Axios interceptor: 401 → clear token → redirect `/login`

### Responsive
- `useIsMobile()` hook (breakpoint: 1024px)
- Separate Mobile/Desktop components where needed
- Tailwind responsive classes for CSS-only responsive

## PayrollPage — Wave 6.5 alignment (2026-06-09)

PayrollPage di-update mengikuti restore engine gross-up (BE commit `2c3ed12`). UI sekarang konsisten sama PFI Excel template. Commits FE: `c35e6c8`, `7a0d481`. Excel export 6-sheet: `9750364`. Swagger refresh 552 routes: `bb6480d`.

### Conditional column: `pph21_paid_by_company`

- Detail row baca flag `payroll.pph21_paid_by_company` (per-payroll setting, sourced dari payroll-setting backend).
- Kalau **true** → PPh21 column dikasih label **"Ditanggung Perusahaan"** dengan badge khusus, dan amount displayed sebagai pajak yang dibayar company (bukan dipotong dari take-home).
- Kalau **false** → PPh21 di-display normal sebagai potongan.
- Gate ini juga mempengaruhi summary totals di footer table (subtotal "Ditanggung Perusahaan" muncul terpisah).

### BPJS labels — gross-up vs netto

Untuk komponen BPJS yang di-gross-up (employer covers employee share), labelnya **"Ditanggung Perusahaan"** — sama-sama bukan potongan take-home, jadi konsisten visually dengan PPh21 gross-up. Yang netto (employee bayar share) tetap di-label normal.

### Label decision: "Gross Up Final" vs "Net Salary"

- **"Gross Up Final"** dipake ketika ada minimal satu komponen yang di-gross-up (PPh21 atau BPJS) — supaya HR sadar angka final ini udah include kompensasi pajak/iuran company.
- **"Net Salary"** dipake ketika semua komponen netto biasa.
- Logic switch di summary section PayrollPage; jangan rename tanpa cek balik ke engine result.

### Detail row sources

Detail row baca dari engine result fields (BE returns nested object):
- `gross_salary`, `bpjs_employer_share`, `bpjs_employee_share`, `pph21`, `pph21_paid_by_company`, `final_net_salary` / `final_gross_up`
- Kalau ada field baru dari engine (e.g., December anuitas Wave 7), tambah ke detail row + adjust label switch.

## Utility Functions (`lib/utils.ts`)

| Function | Description |
|----------|-------------|
| `cn(...classes)` | Merge Tailwind classes (clsx + twMerge) |
| `formatDate(date)` | Indonesian locale date |
| `formatDateTime(date)` | Date + time |
| `formatCurrency(amount)` | IDR currency format |
| `formatNumber(num)` | Locale number format |
| `getInitials(name)` | Extract initials |
| `capitalize(str)` | Title case |
| `debounce(fn, ms)` | Debounce utility |
| `getStatusColor(status)` | Status → Tailwind color |

## API Configuration

- Base URL: `VITE_API_URL` env var (default `/api/v1`)
- Dev proxy: Vite proxies `/api` → `http://localhost:3001`
- Auth: Bearer token from localStorage (sementara — Wave 7.C target: migrate to httpOnly cookies)
- Response format: `{ success: boolean, data: T, message?: string, meta?: PaginationMeta }`

## localStorage policy

**Allowed reads/writes:** `services/api.ts` + `stores/auth.store.ts` only.

Violators flagged in audit (must be migrated before Wave 7.C cookie auth):
- `services/holiday.service.ts:165` reads token directly — bypass interceptor, blocks cookie migration.
- 3 other violators tracked in `AUDIT_FINDINGS.md` (search for "localStorage" in that file).

Pattern wajib: kalau butuh auth header di service, biarkan axios interceptor inject — JANGAN baca `localStorage.getItem('token')` manual.

## Monitoring — Sentry

- ⚠️ `VITE_SENTRY_DSN` is **NOT set** in Vercel (verified 2026-08-11 — `vercel env ls` on
  `pfi-group/peoplehub-frontend` lists only `VITE_API_URL`). Frontend error tracking is
  therefore **disabled in production**.
- Vite inlines `import.meta.env.VITE_*` at **build time**, so the missing var folds the
  `if (sentryDsn)` guard in `main.tsx` to `false` and the whole `Sentry.init()` block is
  dead-code-eliminated. Setting the variable is not enough — a **fresh deploy is required**,
  and a runtime-only variable can never work.
- `Sentry.setUser()` (`App.tsx:164`) sends employee email + name. Confirm that's acceptable
  before enabling; drop those fields and keep only `id` if not.
- `replaysSessionSampleRate` defaults to 0.1 = 10% of *all* sessions recorded, not just
  errored ones. Set `VITE_SENTRY_REPLAY_SAMPLE_RATE="0"` to record only on error
  (`replaysOnErrorSampleRate` is separate, at 1.0). Use the string `"0"` — an **empty**
  string yields `parseFloat('') === NaN` because these fallbacks use `??`, not `||`.
- Sample rate 0.1 (tracesSampleRate + replaysSessionSampleRate), PII off — matches backend Sentry config (`562a7b6`).
- Local dev: leave `VITE_SENTRY_DSN` empty in `.env` to skip init (avoid noise).

## Deployment

- **Platform:** Vercel (Vercel-native build = source of truth)
- **CI removed 2026-06-09** (FE commit `d3dce74`, BE counterpart `c2031a1`). GitHub Actions tidak jalan lagi — deploy signal = Vercel build status. Lihat dashboard Vercel langsung kalau mau cek build, jangan cari workflow runs.
- Build: `npm run build` → `dist/`
- Bundle size: 451KB (gzip ~140KB) post code-splitting. 2.4MB → 451KB = 5.5× smaller (achieved end of Wave 3).
- Env vars: `VITE_API_URL`, `VITE_SENTRY_DSN`

### Smoke-check after deploy

1. Buka URL Vercel preview/prod.
2. Login pakai test user dummy (jangan email PFI live — lihat memory note).
3. Cek route role-based: CEO route, HR Manager route, Employee route → semua harus resolve sesuai role atau redirect `/403`.
4. Buka PayrollPage → pastiin column `pph21_paid_by_company` muncul + label "Gross Up Final" kalau ada gross-up.
5. Buka CompanyAssignmentsPage → kalau crash #306 berarti `lazyNamed` regress.
6. Cek Sentry dashboard untuk error baru.

## Git Conventions

```
feat: Short description     # New feature
fix: Short description      # Bug fix
refactor: Short description # Code restructure
docs: Short description     # Documentation
chore: Short description    # Maintenance
```

Recent FE commits worth knowing (2026-06-09 sweep):
- `c35e6c8`, `7a0d481` — PayrollPage Wave 6.5 alignment
- `d3dce74` — CI workflow removed (Vercel-native build = deploy signal)
- `f0edc38` (area) — Sentry DSN wired in prod env

For backend-side commits (engine `2c3ed12`, Excel `9750364`, Swagger `bb6480d`, Sentry BE `562a7b6`) see backend CLAUDE.md.

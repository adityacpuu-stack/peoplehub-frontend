# PeopleHub Frontend - Developer Guide

## Quick Start

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

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
| Monitoring | Sentry |

## Project Structure

```
src/
├── App.tsx                # Router setup, role-based routing
├── main.tsx               # Entry point + Sentry init
├── index.css              # Tailwind config + CSS variables
├── pages/                 # Feature pages (30+ modules)
│   ├── auth/              # Login, ForgotPassword, ResetPassword
│   ├── dashboard/         # Employee & CEO dashboards
│   ├── employees/         # Employee CRUD, detail, form
│   ├── admin/             # Company, Users, Roles, Audit
│   ├── ceo/               # CEO reports & analytics
│   ├── payroll/           # Payroll processing
│   ├── attendance/        # Attendance tracking
│   ├── leave/             # Leave management
│   ├── contracts/         # Employee contracts
│   ├── performance/       # Performance reviews
│   └── ...                # 20+ more modules
├── components/
│   ├── ui/                # Reusable UI (Button, Input, Modal, Table, etc.)
│   ├── layout/            # Layout, Header, Sidebar
│   ├── auth/              # ProtectedRoute
│   └── profile/           # ProfileCompletion, PasswordChange modals
├── services/              # API service layer (32 files)
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
- Data fetching via `useState` + `useEffect` (no React Query hooks)
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

### Services
- One service per module in `src/services/`
- All methods return typed promises
- Axios interceptor handles auth errors globally

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
4. Role-based routing: CEO gets different dashboard
5. Axios interceptor: 401 → clear token → redirect `/login`

### Responsive
- `useIsMobile()` hook (breakpoint: 1024px)
- Separate Mobile/Desktop components where needed
- Tailwind responsive classes for CSS-only responsive

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
- Auth: Bearer token from localStorage
- Response format: `{ success: boolean, data: T, message?: string }`

## Deployment

- Platform: Vercel
- Build: `npm run build` → `dist/`
- Env vars: `VITE_API_URL`, `VITE_SENTRY_DSN`

## Git Conventions

```
feat: Short description     # New feature
fix: Short description      # Bug fix
refactor: Short description # Code restructure
docs: Short description     # Documentation
chore: Short description    # Maintenance
```

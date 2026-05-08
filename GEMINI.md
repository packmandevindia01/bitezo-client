# Project Rules — client-bitezo

## Tech Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: .NET API
- State Management: Redux (src/store/ with authSlice.ts, index.ts)
- HTTP: axiosInstance with JWT interceptor — reads `accessToken` from localStorage
- System type check: `localStorage.getItem("systemType") === "pos"`
- Environment: `.env`, `.env.development` for Vite proxy config

---

## Actual Project Structure — STRICTLY follow this

```
src/
  api/                  # Global axios instance and interceptors
  app/
    providers/          # App-level providers
    routes/             # AppRoutes.tsx, ProtectedRoute.tsx, RoleGuard.tsx,
                        # RegistrationGuard.tsx, SystemRegistrationGuard.tsx
    App.tsx
    hooks.ts            # Typed Redux hooks (useAppDispatch, useAppSelector)
    store.ts            # Redux store setup
  assets/               # Static assets (images, icons, fonts)
  components/           # Shared/common components ONLY — reuse before creating
  features/
    auth/               # Login, OTP, email check, password reset
    company/            # Company-related features
    dashboard/          # Dashboard pages
    general/            # Recipe, BOM, configuration, provider, providerSettings, happyHour
    inventory/          # Inventory management features
    pos/                # POS-specific features (lockItem, etc.)
    systemRegistration/ # System registration flow
    transaction/        # Vouchers, stock adjustment, production
  hooks/                # Global/shared custom hooks
  lib/                  # Utility libraries and helpers
  utils/                # Utility functions
  config.ts             # App config
  index.css             # Global styles (do not add feature styles here)
  main.tsx              # App entry point
```

---

## Feature Folder Convention
Every feature follows this internal structure — never mix files across layers:

```
features/<domain>/
  components/     # UI components specific to this feature
  hooks/          # Custom hooks → use<Feature>.ts
  pages/          # Page components → <Feature>Page.tsx
  services/       # API calls → <feature>Api.ts
  store/          # Redux slices → <feature>Slice.ts (only if needed)
  types/          # TypeScript interfaces/types for this feature
```

**Existing feature domains:**
- `auth` — authentication flows
- `company` — company management
- `dashboard` — dashboard views
- `general` — recipe, BOM, configuration, provider, providerSettings, happyHour
- `inventory` — inventory management
- `pos` — POS-specific (lockItem, cashier flows, etc.)
- `systemRegistration` — system registration
- `transaction` — vouchers, stock adjustment, production

---

## Routing Rules
- All routes live in `src/app/routes/AppRoutes.tsx` only — never define routes elsewhere
- All pages must be lazy-loaded: `const XPage = lazy(() => import("..."))`
- Lazy import path pattern: `../../features/<domain>/<feature>/pages/<Feature>Page`
- Route guards — use the correct one per context:
  - `ProtectedRoute.tsx` — requires valid accessToken
  - `RoleGuard.tsx` — requires a specific user role
  - `RegistrationGuard.tsx` — for registration flow
  - `SystemRegistrationGuard.tsx` — for system registration flow
- When adding a new page: add lazy import + route in AppRoutes.tsx following the existing pattern

---

## Component Architecture
- Functional components with hooks only — never class components
- Named exports for all components — never use default export for a component
- Props interface defined directly above the component in the same file
- File naming: PascalCase `.tsx` for components, camelCase `.ts` for hooks/services/utils

---

## Existing Common Components — ALWAYS reuse, NEVER recreate

These live in `src/components/`. Check here before building anything new:

| Component        | Use for                                                          |
|------------------|------------------------------------------------------------------|
| `Modal`          | All dialogs and overlays                                         |
| `Button`         | All clickable actions                                            |
| `FormInput`      | All text/number inputs                                           |
| `SelectInput`    | All standard dropdowns                                           |
| `SearchableSelect` | Dropdowns with search                                          |
| `RecordTableCard`| All data table listings                                          |
| `ConfirmDialog`  | Delete/destructive confirmations — NEVER use `window.confirm`    |
| `PageShell`      | All page wrappers/layouts                                        |
| `SearchBar`      | Search input fields                                              |
| `ImageUploadPanel` | Image upload UI                                                |

---

## API & HTTP Rules
- All API calls go through `axiosInstance` from `src/api/` — never use raw `fetch` or bare `axios`
- Use the `unwrap()` helper to inspect response bodies for success/error — do not rely on HTTP status codes alone
- Backend returns 200 even for business errors — always check the response body
- Service files: `src/features/<domain>/<feature>/services/<feature>Api.ts`
- Auth token: `localStorage.getItem("accessToken")`
- System type: `localStorage.getItem("systemType")`
- Vite proxy is configured via `.env.development` — do not hardcode API base URLs

---

## State Management Rules
- Global Redux store: `src/store/` (authSlice.ts, index.ts)
- Feature-level Redux slices: `src/features/<domain>/<feature>/store/<feature>Slice.ts`
- Always use typed hooks from `src/app/hooks.ts`:
  - `useAppDispatch` instead of `useDispatch`
  - `useAppSelector` instead of `useSelector`
- Never import `useDispatch` or `useSelector` directly from `react-redux`
- Auth state lives in `authSlice.ts` — do not duplicate auth logic elsewhere

---

## Custom Hook Pattern
- One hook per feature: `use<Feature>.ts` inside `features/<domain>/hooks/`
- The hook owns: all state, CRUD operations, loading state, error state
- The page/component only calls the hook and renders — zero business logic in components
- Shared hooks that span multiple features go in `src/hooks/`

**Example pattern:**
```ts
// useCategory.ts — owns all logic
const useCategory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  // fetch, create, update, delete...
  return { items, loading, ... };
};

// CategoryPage.tsx — renders only
const CategoryPage = () => {
  const { items, loading, ... } = useCategory();
  return <PageShell>...</PageShell>;
};
```

---

## Styling Rules
- Tailwind CSS utility classes only — no inline styles, no new CSS files, no CSS modules
- `index.css` is for global base styles only — never add feature-specific styles there
- Match existing spacing, color, and border-radius patterns already in the project
- Never introduce a new visual pattern without checking existing components first

---

## Auth Feature Notes (`src/features/auth/`)
- OTP flow: `OtpForm.tsx` + `OtpInput.tsx`
- Login: `LoginForm.tsx`
- Email check: `EmailForm.tsx`
- Password reset: `ResetPasswordForm.tsx`
- All auth API calls through `authApi.ts`
- OTP verification is only for new customer creation — not for edit flows

---

## TypeScript Rules
- Never use `any` — use `unknown` and narrow it, or define a proper interface
- All API response shapes must have a typed interface in the feature's `types/` folder
- Enable strict mode — do not disable TypeScript errors with `// @ts-ignore`
- Props interfaces must be explicit — no implicit prop types

---

## Behavior Rules
- Before creating a new component → check `src/components/` first
- Before creating a new feature folder → check if the domain already exists under `src/features/`
- Before creating a new hook → check `src/hooks/` for shared hooks
- Never duplicate a page, hook, or service — extend the existing one instead
- If the correct location for a file is unclear → ask before creating
- No unused imports in any file
- No `console.log` statements in production code
- If unsure about design or architecture → ask before proceeding
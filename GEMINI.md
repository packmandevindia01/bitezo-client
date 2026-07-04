# Project Rules — client-bitezo
# Cloud-Based POS + Backoffice System

## Tech Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: .NET API
- State Management: Redux (src/store/ with authSlice.ts, index.ts)
- HTTP: axiosInstance with JWT interceptor — reads `accessToken` from localStorage
- System type check: `localStorage.getItem("systemType") === "pos"`
- Environment: `.env`, `.env.development` for Vite proxy config

---

## Next-Generation Architecture Rule (NEW STANDARD)
*Every new feature and any major refactor of an existing feature MUST strictly follow this architecture:*

**Golden Reference Modules:** Look at `src/features/transaction/production` or `src/features/transaction/internalStockTransfer` for the perfect implementation of this architecture.

- **Data Fetching:** MUST use `@tanstack/react-query` (`useQuery`, `useMutation`) instead of manual `useEffect` fetching. Rely on React Query for caching, loading states, and cache invalidation.
- **Form Management:** MUST use `react-hook-form` (`useForm`, `useFieldArray`, `useWatch`) instead of creating localized `useState` variables for inputs.
- **Validation:** MUST use `zod` for rigorous schema definitions, integrated into forms via `@hookform/resolvers/zod`. Fail fast and display inline errors safely without sending bad payloads to the backend.
- **State Encapsulation:** Form logic, API integration, and mathematical calculations MUST be encapsulated inside a dedicated hook (e.g. `useRecipeForm.ts`). The Page component must remain purely a visual shell that maps state to UI components.

> **Exception — Shared/Common Components:** Components that live in `src/components/` (global common components) or `src/features/transaction/shared/components/` (shared transaction UI) are **exempt** from this architecture rule. These are reusable UI building blocks used across many features. They may use local `useState`, `useEffect`, and direct service calls as needed, since wrapping them in `react-hook-form`/`zod`/dedicated hooks would over-engineer a generic utility. Keep them self-contained and focused solely on their UI responsibility.

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
features/<domain>/<feature>/
  components/     # UI components specific to this feature
  hooks/          # Custom hooks → use<Feature>.ts
  pages/          # Page components → <Feature>Page.tsx
  services/       # API calls → <feature>Api.ts
  store/          # Redux slices → <feature>Slice.ts (only if needed)
  constants.ts    # Constants specific to this feature (optional)
  index.ts        # Exports pages and types
  types.ts        # TypeScript interfaces/types for this feature
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

### Large Feature Component Organization (Sub-Domains)
* If a feature's `components/` folder grows beyond 10-15 files (like the POS Terminal), it **MUST** be broken down into functional sub-domains to prevent a monolithic folder structure.
* Group components by their logical domain (e.g., `components/modals/`, `components/cart/`, `components/layout/`, `components/menu/`).
* Never dump dozens of distinct UI components, dialogs, and layout wrappers into a single flat `components/` directory.

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

| Component          | Use for                                                        |
|--------------------|----------------------------------------------------------------|
| `Modal`            | All dialogs and overlays                                       |
| `Button`           | All clickable actions                                          |
| `FormInput`        | All text/number inputs                                         |
| `SelectInput`      | All standard dropdowns                                         |
| `SearchableSelect` | Dropdowns with search                                          |
| `RecordTableCard`  | All data table listings                                        |
| `ConfirmDialog`    | Delete/destructive confirmations — NEVER use `window.confirm`  |
| `PageShell`        | All page wrappers/layouts                                      |
| `SearchBar`        | Search input fields                                            |
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
  return { items, loading, ... };
};

// CategoryPage.tsx — renders only
const CategoryPage = () => {
  const { items, loading } = useCategory();
  return <PageShell>...</PageShell>;
};
```

---

## POS Input UX Rules — CRITICAL, apply to every form/page

This is a POS system used with keyboard. Input behavior must be consistent across all pages.

### 1. Autofocus — First Input Field
- Every page and every modal form MUST autofocus the first input field on mount
- Use the `autoFocus` prop on the first `FormInput` in every form
- If `FormInput` does not support `autoFocus`, pass it through to the underlying `<input>` element
- For modals, autofocus must trigger when the modal opens, not when the page loads
- Never leave the cursor unpositioned — the user should be able to start typing immediately

```tsx
<FormInput
  label="Name"
  autoFocus
  value={form.name}
  onChange={...}
/>
```

### 2. Tab Key Navigation
- All input fields must be keyboard-navigable using the Tab key in logical top-to-bottom, left-to-right order
- Never use `tabIndex={-1}` on a field the user needs to reach via keyboard
- Use `tabIndex` explicitly only when the natural DOM order is wrong (e.g. multi-column layouts)
- Buttons (Save, Cancel, Submit) must also be reachable via Tab after the last input field
- **EXCEPTION**: "Clear", "Reset Form", and "New" buttons must use `tabIndex={-1}` to avoid interrupting the flow to the primary action.
- SelectInput and SearchableSelect must support Tab to move focus out after selection
- Do not trap focus inside a section unless it is a modal (modals should trap focus within themselves)

```tsx
<FormInput tabIndex={1} label="Code" ... />
<FormInput tabIndex={2} label="Name" ... />
<SelectInput tabIndex={3} label="Category" ... />
<FormInput tabIndex={4} label="Price" ... />
```

### 3. Money / Numeric Fields — Right-Aligned Text (Input Only)
- Any input field that deals with money, price, cost, amount, quantity, rate, discount, or tax MUST have right-aligned text.
- Apply `text-right` Tailwind class to the inner input element via `inputClassName`.
- **CRITICAL**: Only the text *inside* the input box is right-aligned. The **Label** must always remain **left-aligned** for visual consistency in form grids.
- Never left-align a numeric/money value — it is confusing for cashiers reading values.
- **Hide Spinners**: All `<input type="number">` fields across the application MUST hide the browser's default up/down arrows (spinners). This is handled globally via CSS in `index.css`, so avoid adding inline styles or classes like `[&::-webkit-inner-spin-button]:appearance-none` manually to components.

```tsx
<FormInput
  label="Price"
  type="number"
  inputClassName="text-right"
  value={form.price}
  onChange={...}
/>
```

**Money field keyword reference — always right-align if field name contains:**

| Keyword   | Examples                                       |
|-----------|------------------------------------------------|
| price     | price, sellingPrice, purchasePrice, unitPrice  |
| cost      | cost, costPrice, landedCost                    |
| amount    | amount, totalAmount, netAmount                 |
| rate      | rate, taxRate, discountRate                    |
| discount  | discount, discountAmount, discountPercent      |
| tax       | tax, taxAmount, cgst, sgst, igst, vat          |
| total     | total, subTotal, grandTotal, netTotal          |
| balance   | balance, openingBalance, closingBalance        |
| qty/quantity | quantity, qty, openingQty                   |

---

## General POS Frontend Rules

This is a cloud-based POS with a backoffice. These rules apply across the entire system.

### 4. Loading & Async States
- Every API call must show a loading state — never leave the UI frozen without feedback
- Use a loading spinner or disabled state on the Submit/Save button while a request is in flight
- Disable all form inputs while a save/delete operation is pending — prevent double submissions
- Show skeleton loaders on list/table pages while data is loading — never show an empty page
- Never show raw error objects — always show a human-readable message from the response body

```tsx
<Button disabled={loading} loading={loading}>
  {loading ? "Saving..." : "Save"}
</Button>
```

### 5. Form Behavior
- All forms must have validation before submission — never send empty required fields to the API
- Show inline validation errors inline next to the label (e.g., `(required)` inside the flex label row in lowercase red text) to avoid breaking the UI layout and shifting elements.
- Required fields must be visually marked with a red asterisk (`*` using class `text-red-500`) next to the label. Never use amber/yellow for required asterisks.
- On successful save: close the modal/form, refresh the list, show a success toast
- On error: keep the form open, show the error message, do not reset the form
- Decimal inputs (price, rate, cost, amount) must restrict to `getDecimalPart()` decimal places — never hardcode 2 or 3
- Quantity inputs must restrict to whole numbers unless the item explicitly supports decimal qty
- Never allow negative values in price, cost, quantity, or amount fields
- Read-only or disabled input fields must use the `cursor-not-allowed` Tailwind CSS class so that a red circle with a line through it appears when hovered, visually indicating that the field is locked.
- **High-Frequency Input State**: Never store real-time keystroke state (e.g., numeric keypad input) in a high-level parent component like a Page. Always localize `inputValue` state inside the Modal or localized component, and only pass the final value up via an `onSubmit` callback. This prevents massive UI re-renders on every keystroke.
- **Safe Component Memoization**: When wrapping a component in `React.memo()` (like `PosProductGrid`), never pass inline functions or raw `useCallback` functions from the parent if they depend on rapidly changing state (like a shopping cart). This causes either broken memoization or "Stale Closures". Always use the `useEvent` hook (Latest Ref Pattern) to stabilize the callback reference while ensuring it has access to the absolute latest state.
- **Browser Autocomplete Dropdowns**: Never use custom values like `new-username` for the `autoComplete` property on standard text inputs. This overrides the default global `"off"` and triggers Chrome's native input history dropdown, covering custom dropdowns and forms. Standard text inputs must remain unassigned so they default to `"off"`. Only use `new-password` explicitly on password input fields.


### 6. Master Data Pages (Backoffice) — Uniform Header Pattern
- Every master data page (Category, Product, Customer, Supplier, etc.) follows this pattern:
  1. `PageShell` as the outer wrapper
  2. A dedicated uniform header section (`<div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">`) containing a `SearchBar` on the left and the "+ Add" `Button` on the far right. Do NOT pass search or add actions into the `RecordTableCard` props.
  3. `RecordTableCard` for the data list
  4. `Modal` + form for Add/Edit (unless it's a complex multi-tab form like Product Master)
  5. `ConfirmDialog` for delete confirmation
- **Layout Pattern**:
  ```tsx
  <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
    <div className="flex gap-4 items-end flex-1">
      <div className="flex-1 max-w-sm"><SearchBar ... /></div>
    </div>
    <Button icon={<Plus size={18} />}>+ Add Record</Button>
  </div>
  ```
### 6a. Transaction List Pages (Vouchers, Invoices, Returns) — Filter Header Pattern
- Transaction list pages that include date filters (`From Date`, `To Date`) MUST organize their search and filter controls in a dedicated header section ABOVE the `RecordTableCard`, rather than putting them inside the card's `extraActions` or `search` props.
- The layout must use a `flex` container that aligns the date inputs, search bar, and branch selector (if applicable) in a row on desktop, and wraps on mobile.
- The "Add / New" button must also be placed on the far right of this top header section, NOT passed via the `actionLabel` prop to `RecordTableCard`.
- **Layout Pattern**:
  ```tsx
  <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
    <div className="flex gap-4 items-end flex-1">
      <div className="w-40"><FormInput label="From Date" type="date" ... /></div>
      <div className="w-40"><FormInput label="To Date" type="date" ... /></div>
      <div className="flex-1 max-w-sm"><SearchBar ... /></div>
      <div className="w-48"><SelectInput label="Branch" ... /></div>
    </div>
    <Button icon={<Plus size={18} />}>Add New</Button>
  </div>
  ```
- The `RecordTableCard` then remains a simple presentation component without its own search or action props.
- **Auto-Fetching & React Query**: The hook for the list page (`use<Feature>List.ts`) MUST use `@tanstack/react-query` to automatically fetch data when API filters (like `FromDate`, `ToDate`, `BranchId`) change. Do NOT use a manual `Search` button or manual `fetchList` calls for fetching data.
- **Search Bar / Filtering**: The `SearchBar` should be used for instant client-side filtering on the fetched `records` using a local `searchTerm` state. Do not trigger an API call on every keystroke.
- The list must reload automatically after every Add, Edit, or Delete operation (via React Query invalidation or refetch).
- Every list page must show the total record count
- Tables must have consistent columns: Code | Name | (feature-specific fields) | Status | Actions
- Action buttons per row: Edit (pencil icon) and Delete (trash icon) — consistent across all pages.
  - **Edit Button Pattern**: `<button className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"><Pencil size={16} /></button>`
  - **Delete Button Pattern**: `<button className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>`

### 6b. Transaction Form Pages (Standalone Forms)
- Transaction form pages that are rendered as separate full pages (not modals) MUST NOT have a "Cancel" or "Back" button in the bottom action bar.
- Instead, place a Close "X" button (`<X size={20} />` from lucide-react) in the absolute top-right corner of the white form container. Clicking this should navigate back to the list page.
- Layout for the X button: `<button onClick={() => navigate("...")} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Close"><X size={20} /></button>` (make sure the parent container has `relative` class).
- If the form is opened in Edit mode and the transaction is not already cancelled/deleted, place a "Delete" (or "Cancel Invoice") button next to the "Clear" and "Save" buttons on the right side of the bottom action bar.

### 7. Code / ID Fields
- Auto-generated codes (item codes, voucher numbers) must be read-only in the form
- If the code is user-editable, it must be UPPERCASE only — enforce with `toUpperCase()` on change
- Never allow spaces in code/ID fields — strip or replace with underscore on input

```tsx
onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
```

### 8. Status / Active-Inactive Toggle
- Every master record (Product, Customer, Category, etc.) must have an Active/Inactive status
- Display status as a colored badge in the list: green for Active, red/gray for Inactive
- Use the standardized `Checkbox` (Toggle Switch) in the edit form for this status.
- Inactive records must NOT appear in POS transaction dropdowns/searches
- When deleting is not allowed (due to existing transactions), deactivate instead of delete
- Show a clear message when a record cannot be deleted: "This record is used in transactions. Deactivate it instead."

### 9. POS Transaction Pages
- Transaction entry pages (sales, purchase, payment) must support full keyboard operation
- Item/product search in transaction lines must open on barcode scan or typing — no mouse required
- After adding an item line, focus must return to the item search field automatically
- Quantity and price fields in transaction lines are always right-aligned (see Rule 3)
- Totals (subtotal, tax, discount, grand total) are always read-only calculated fields
- Grand total must always be prominently displayed — large font, high contrast
- Payment method selection must be reachable via keyboard
- Never allow saving a transaction with zero amount or zero items

### 10. Voucher / Reference Numbers
- All voucher numbers are system-generated and read-only — never let users edit them
- Display voucher numbers in a monospace or distinct font to distinguish from other text
- Voucher numbers must be copyable (do not disable text selection)

### 11. Date & Time Fields
- All date inputs must default to today's date unless the context requires otherwise
- Date format must be consistent across the entire app — decide one format (DD/MM/YYYY or YYYY-MM-DD) and never mix
- Transaction dates must not allow future dates unless the feature explicitly requires it (e.g. advance orders)
- Financial year/period awareness: warn the user if they are entering a transaction in a closed period

### 12. Decimal & Number Formatting (Display) — DYNAMIC, never hardcoded

Currency symbol and decimal places are stored in localStorage and must ALWAYS be read dynamically:

```ts
// src/utils/currency.ts — create this file, import everywhere

export const getCurrencySymbol = (): string =>
  localStorage.getItem("currencySymbol") ?? "BHD";

export const getDecimalPart = (): number =>
  parseInt(localStorage.getItem("decimalPart") ?? "3", 10);

export const formatCurrency = (value: number): string => {
  const decimals = getDecimalPart();
  const symbol = getCurrencySymbol();
  return `${symbol} ${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const formatAmount = (value: number): string => {
  const decimals = getDecimalPart();
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
```

**Rules:**
- NEVER hardcode `.toFixed(2)` — decimal places are dynamic (`getDecimalPart()`)
- NEVER hardcode currency symbol as "BHD", "₹", "$" — always `getCurrencySymbol()`
- All money display must use `formatCurrency()` or `formatAmount()` — never inline
- **Avoid Floating-Point Precision Errors in Input Fields**: Never pass raw floats or raw `.toString()` (e.g. `totalDue.toString()`) to input field states for money/numeric inputs, as this causes long decimal errors like `0.8800000000000001`. Always format/round them first using `.toFixed(getDecimalPart())` or `.toFixed(decimalPart)`.
- `step` attribute on money inputs must be dynamic:
```tsx
  const step = Math.pow(10, -getDecimalPart()).toString(); // "0.001" for BHD
  <FormInput type="number" step={step} inputClassName="text-right" ... />
```
- **React Hook Form & Zod Schema for Money Fields**: To ensure `<input type="number">` successfully displays trailing zeroes (e.g. `0.000` instead of `0`), you MUST NOT use `valueAsNumber: true` in the `register` call, and you MUST NOT use `z.coerce.number()` in the Zod schema. Instead:
  1. Define the field as a string in Zod with a refine block: `amount: z.string().min(1, "Amount is required").refine(val => Number(val) > 0, "Invalid amount")`
  2. Set the default value as a formatted string: `amount: (0).toFixed(decimalPart)`
  3. Register the input simply as a string: `{...register('amount')}`
  4. Cast it to a number before sending to the API: `amount: Number(data.amount)`
- **Auto-Select Numeric Text on Focus**: Every editable numeric or money field inside a data grid (e.g., Qty, Cost, Price, Discount) MUST include `onFocus={(e) => e.target.select()}`. This ensures that when a user clicks or tabs into a field with a default value like `0.000` or `1`, the entire text is highlighted so that their immediate keystroke overwrites it completely, preventing errors like typing `4` and getting `0.0004`.
- Column headers show symbol: `<th>Price ({getCurrencySymbol()})</th>`
- Column cells use amount only: `<td className="text-right">{formatAmount(item.price)}</td>`
- Grand total uses full format: `<span>{formatCurrency(grandTotal)}</span>`

```ts
// Utility to use everywhere for money display
const formatCurrency = (value: number) =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
```

### 13. Permissions & Role-Based UI
- Use `RoleGuard` to conditionally show/hide UI elements based on user role
- Never show Delete buttons to roles that do not have delete permission — hide, do not just disable
- Backoffice settings pages (configuration, user management) are accessible to Admin role only
- POS pages are accessible to Cashier role and above
- Never rely on frontend-only permission checks for actual data security — that is the backend's job

### 14. Offline / Network Awareness
- Show a visible banner or indicator when the user loses internet connection
- Disable all Save/Submit actions when offline — do not let users submit forms that will silently fail
- When connection is restored, show a success indicator and allow normal operation

### 15. Responsiveness — REQUIRED across the entire project

The entire application (both POS and Backoffice) must be fully responsive.
Every page must work correctly on all screen sizes from mobile (375px) to large desktop (1920px).

**Breakpoint system — always use Tailwind responsive prefixes:**

| Prefix | Min Width | Target Device          |
|--------|-----------|------------------------|
| (none) | 0px       | Mobile portrait (base) |
| sm:    | 640px     | Mobile landscape       |
| md:    | 768px     | Tablet                 |
| lg:    | 1024px    | Laptop / POS terminal  |
| xl:    | 1280px    | Desktop                |
| 2xl:   | 1536px    | Large desktop          |

**Layout rules by screen size:**

- Mobile (base → sm): single column, stacked layout, full-width inputs and buttons. Sidebar is hidden.
- Tablet (md) & Laptop (lg): 2-column or 3-column grids. **Sidebar is collapsed/hidden by default** to maximize data entry space (critical for 1024x768 terminals).
- Desktop (xl+): Full multi-column layout, sidebar visible by default, data tables show all columns.

**ERP High-Density Typography & Spacing:**
- **Labels**: All form labels must be `text-[10px] font-bold uppercase tracking-widest text-slate-600`.
- **Vertical Spacing**: Use `gap-y-3` for form grids and `mb-1` for individual input wrappers.
- **Component Height**: Standardize all `FormInput`, `SelectInput`, and `SearchableSelect` components to a fixed height of **`h-10.5` (42px)**.
- **Text Size**: All text *inside* input boxes and selects must be **`text-sm`** (14px).

**Grid and form layouts:**
```tsx
// Form fields — single column on mobile, 2 col on md, 3 col on lg
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <FormInput label="Code" ... />
  <FormInput label="Name" ... />
  <SelectInput label="Category" ... />
</div>

// Action buttons — full width on mobile, auto width on md+
<Button className="w-full md:w-auto">Save</Button>
```

**Data tables (RecordTableCard):**
- On mobile: hide non-essential columns, show only Code, Name, and Actions
- On tablet+: show all columns
- Never let a table overflow horizontally without a scroll wrapper
- Use `overflow-x-auto` wrapper on all tables so mobile users can scroll

```tsx
<div className="overflow-x-auto">
  <RecordTableCard ... />
</div>
```

**POS terminal pages (pos/ features):**
- Must be fully usable on tablet (768px+) as well as POS terminal screens (1280px+)
- Touch-friendly tap targets: minimum 44px height on all buttons and interactive elements
- KOT, payment, and order panels must stack vertically on tablet, side-by-side on lg+

```tsx
// POS order layout
<div className="flex flex-col lg:flex-row gap-4">
  <div className="flex-1">{ /* menu/items */ }</div>
  <div className="w-full lg:w-80">{ /* order panel */ }</div>
</div>
```

**Modals:**
- On mobile: full screen or near-full screen modal (90vw, 95vh max)
- On desktop: centered fixed-width modal (max-w-lg, max-w-2xl etc.)

```tsx
<Modal className="w-full max-w-[95vw] md:max-w-lg">
```

**Typography and spacing:**
- Font sizes must be readable on small screens — never go below `text-sm` (14px) for body content
- Use responsive padding: `p-3 md:p-6` — tighter on mobile, comfortable on desktop
- Touch targets must be at least 44px tall on all interactive elements

**Vertical Space Constraints on POS Terminals:**
- The standard project device screen is a POS terminal which often has restricted vertical height (e.g. 1024x768 or similar compact displays).
- **CRITICAL**: Because a POS terminal screen is wide (1024px triggers `lg:`), Tailwind will try to apply large desktop paddings and margins. However, because it is extremely short (768px), this scaling will push content off the bottom of the screen.
- **NEVER** use `md:` or `lg:` blindly to increase vertical padding, gap sizes, or button heights in POS pages. Save the huge, spacious styling (e.g. `p-16`, `gap-8`) strictly for `xl:` or `2xl:` screens.
- Keep standard `md:` and `lg:` spacing relatively compact (`p-4`, `p-6`, `gap-3`) so it perfectly fits a 768px height screen.

**Zero Scrolling Philosophy for POS Views:**
- Because this is a high-speed POS environment, users rely on muscle memory and fast taps. Scrolling ruins this workflow.
- You must aim to fit the entire UI "above the fold" on standard POS pages.
- **CRITICAL Page Wrapper Pattern**: Every transaction/POS page MUST use the exact `calc(100vh - 120px)` and `flex-1 overflow-y-auto` wrapper pattern to guarantee the sticky action footer stays anchored to the bottom of the screen.
  ```tsx
  <PageShell title="Transaction Page">
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {/* Form Content */}
      </div>
      {/* ── Sticky Action Footer ── */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 rounded-b-3xl">
        <Button>Save</Button>
      </div>
    </div>
  </PageShell>
  ```
- Avoid using `overflow-y-auto` on inner nested containers as a lazy fix for bad layout sizing. The default 1024x768 view should NEVER trigger a scrollbar on the outer container.
- Never design modals or panels that expand vertically beyond the viewport and hide their submit/action buttons.

**What NEVER to do:**
- Never use fixed pixel widths like `width: 1280px` or `min-w-[1280px]` — this breaks mobile
- Never use `hidden` to permanently hide content on mobile without providing an alternative
- Never rely on hover states alone for functionality — hover does not exist on touch screens
- Never hardcode heights in px for layout containers — use min-h, auto, or viewport units

### 16. Toast Notifications
- Success operations → green toast
- Validation or warning → yellow/amber toast
- API errors → red toast
- Toasts must auto-dismiss after 3–5 seconds
- Never show more than 3 toasts stacked at once
- Toast messages must be human-readable: "Category saved successfully." not "200 OK"

### 17. Empty States
- Every list/table must show a meaningful empty state when there are no records
- Empty state must include: an icon, a short message ("No categories found"), and an Add button
- Never show a blank white area — always give the user a clear next action

### 18. Confirmation Before Destructive Actions
- Always use `ConfirmDialog` before: Delete, Deactivate, Cancel Transaction, Clear Form
- Confirmation message must name the record: "Delete 'Chicken Burger'?" not just "Are you sure?"
- Never auto-delete on single click — always require a second confirmation step

### 19. Clear / Reset Buttons — Skip Keyboard Focus
- To optimize speed for keyboard users, "Clear", "Reset Form", or "New" buttons must NOT receive focus during Tab key navigation.
- Apply `tabIndex={-1}` to all buttons that clear or reset form data.
- This allows the user to tab directly from the last input field to the primary action button (Save, Update, Create) without interruption.

### 20. Standardized Action Buttons (isAction) — REQUIRED
- All primary and secondary action buttons in form footers, headers, or sticky bars must use the `isAction` prop from the `Button` component.
- This prop enforces a uniform, professional dimension of **120px x 44px**.
- **Icons + Labels**: Every action button MUST feature both a `lucide-react` icon and a clear text label (e.g., Save, Delete, Clear).
- Labels must be **always visible** alongside icons across all screen sizes (no hiding on mobile).
- Always provide the icon via the `icon` prop of the `Button`.
- Primary actions (Save/Update) use `variant="primary"` (default). Secondary actions (Clear/New/Cancel) use `variant="secondary"`. Destructive actions (Delete) use `variant="danger"`.

```tsx
<Button
  onClick={handleSave}
  isAction
  loading={saving}
  icon={<Save size={18} />}
>
  Save
</Button>
```

### 21. Toggle Switch Design (Checkbox) — REQUIRED
- All binary settings, active/inactive states, or "Yes/No" choices must use the `Checkbox` component from `src/components/common/`.
- The `Checkbox` component is globally styled as a premium **Toggle Switch**.
- Never use native HTML checkboxes or manual toggle implementations — this breaks visual consistency.
- Ensure the `label` prop is used to provide context to the switch.

```tsx
<Checkbox
  checked={form.isActive}
  onChange={(e) => setField("isActive", e.target.checked)}
  label={form.isActive ? "Active" : "Inactive"}
/>
```

### 22. Grid Alignment of Action/Trigger Buttons inside Forms
- Contextual form actions, setup triggers, or panel toggles (such as "Branch Allocation", "Modifier Allocation") that belong inside the form fields section must NOT hang in their own full-width row below the fields if there is an odd number of fields.
- Instead, place them **inside the primary form fields grid container** (e.g., `grid-cols-1 md:grid-cols-2`) side-by-side with other fields or toggles (such as a status Checkbox/Toggle switch).
- Wrap the button in a layout div like `<div className="flex items-center pt-2">` to align it perfectly with the height of neighbouring inputs or checkboxes in the same grid row, ensuring a clean and symmetric appearance.

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
  <div className="flex flex-col gap-1 mb-1 w-full">
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
      Delivery Status
    </span>
    <div className="flex items-center h-10.5">
      <Checkbox
        checked={deliveryStatus}
        onChange={...}
        label="Delivery Disabled"
      />
    </div>
  </div>

  <div className="flex flex-col gap-1 mb-1 w-full">
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
      Branch Allocation
    </span>
    <Button
      type="button"
      variant="secondary"
      className="bg-[#f0e8ed] text-[#49293e] hover:bg-[#e7dbe2] w-full h-10.5 justify-center font-bold"
      onClick={...}
      icon={<Building2 size={18} />}
    >
      Branch Allocation
    </Button>
  </div>
</div>
```

### 23. Last-In-First-Out (LIFO) List Sorting — REQUIRED
- All backoffice list pages (master data, transactions, reports, etc.) must consistently display the most recently created or updated items at the top of the list.
- Do not rely on the default order returned by the backend API. Always enforce client-side descending sort before setting state.
- Sort primarily by Date (e.g. `createdAt`, `transDate`) descending, and secondarily by ID (e.g. `id`, `transId`) descending to ensure the newest records appear first.

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
- Before creating a new component — check `src/components/` first
- Before creating a new feature folder — check if the domain already exists under `src/features/`
- Before creating a new hook — check `src/hooks/` for shared hooks
- Never duplicate a page, hook, or service — extend the existing one instead
- If the correct location for a file is unclear — ask before creating
- No unused imports in any file
- No `console.log` statements in production code
- If unsure about design or architecture — ask before proceeding

---

## 24. Strict Production Standards (No Development Fallbacks)
- **No Hardcoded Tenants/Databases:** Never leave hardcoded fallback databases (e.g., `app_db`, `test_db`) or hardcoded tenant IDs in API calls. Missing tenant IDs must fail fast (`""` or throw an error) to prevent cross-tenant data leakage.
- **No Localhost Endpoints:** Never commit hardcoded `http://localhost` URLs or dummy API keys. Always use `.env` variables or dynamic runtime configurations (`config.ts`).
- **No Silent Failures:** Do not bypass critical business logic with dummy data arrays, mocked UI components, or silent API failures unless explicitly marked with a `TODO:` for active development.
- **Cleanup:** All temporary development shortcuts must be strictly removed before pushing code intended for a production environment.

---

## 25. 800px Tablet Layout Constraints (CRITICAL)
- **CSS Grid and Fixed Drawers:** When a column (like an Order Panel) transforms into a `fixed` sliding drawer on smaller screens, you MUST update the parent CSS grid (`grid-cols-x`) to remove that column. Otherwise, the grid will leave a massive empty hole that squishes all remaining content.
- **Horizontal Scrolling vs Squishing:** When putting multiple buttons into a horizontally scrolling Top Navigation or header, do NOT use `min-w-0` on the buttons. Use `shrink-0` so they maintain their full width and correctly trigger the parent's `overflow-x-auto` instead of clipping their text.
- **Typography Density:** Do not use aggressive text classes (`font-black`, `tracking-wider`) on buttons inside dense, multi-column layouts (e.g., a 5-column Action Button grid on an 800px screen). Use `font-bold` and standard tracking to ensure text fits cleanly inside button boundaries.
- **Floating Button Anchors:** Do not anchor floating elements (like Cart bubbles) to the absolute bottom of the main viewport (`fixed bottom-6`) if there is a fixed Action Bar spanning the bottom of the screen. Anchor floating elements inside a `relative` wrapper (like the product grid) so they sit *above* the action buttons.

---

## 26. Monolith Decomposition & Employee Authorization (Phase 3 Standard)
- **Breakdown Large Modals:** Never build massive modals (like Split, Combine, Settlement) with all business logic inline. Break them down into custom hooks (e.g., `useSplitOrderData`, `useSplitBuckets`) that manage mathematical/state logic and React Query API calls, separating them from the UI presentation components.
- **Strict Backend Validation (EmployeeId vs UserId):** The backend explicitly strictly validates `EmployeeId` against the `Employees` table for many critical actions (like `order-split`, `order-void`, `order-recall`). Passing a generic `userId` (like `1`) or `0` will trigger a backend `404 Reference Not Found` if that exact ID does not exist in the Employees table.
- **Always Request Authorization:** Before opening critical order modification modals (Split, Void, Recall), you MUST wrap the action in `requestAuthorization` from `useEmployeeAuthorization`.
  - Capture the returned, verified `employeeId`.
  - Send this verified `employeeId` in the API payload instead of falling back to Redux session state, guaranteeing the backend database validation will pass.

---

## 27. Post-Feature Pedagogical Review (Interview Prep)
Whenever we complete a feature, the AI MUST provide a summary answering these 6 specific categories to help the developer understand the code deeply and prepare for technical interviews:

1. **Understand WHAT was built**
   - "Explain what this code does, line by line, in simple terms"
   - "What is the overall flow of data in this feature?"
   - "What are the main functions/components and what does each do?"
2. **Understand WHY decisions were made**
   - "Why did you choose this approach instead of [alternative]?"
   - "What are the trade-offs of this implementation?"
   - "Why did you use useState here instead of useReducer?"
   - "Why this API call structure instead of another?"
3. **Understand EDGE CASES**
   - "What edge cases does this code handle?"
   - "What happens if the API fails here?"
   - "What happens if the user does X unexpected action?"
   - "Is there any race condition possibility here?"
4. **Understand PERFORMANCE implications**
   - "Are there any performance concerns with this code?"
   - "Would this cause unnecessary re-renders?"
   - "Is there a more optimized way to write this?"
5. **Understand HOW TO EXPLAIN it in an interview**
   - "If an interviewer asks me to explain this feature, how should I describe it in 2-3 sentences?"
   - "What follow-up questions might an interviewer ask about this code?"
   - "Simplify this explanation as if explaining to a non-technical person"
6. **Understand CONNECTIONS to fundamentals**
   - "What JavaScript/React concepts does this code use?"
   - "Is there a closure happening here? Where?"
   - "Where is 'this' keyword behavior relevant in this code?"
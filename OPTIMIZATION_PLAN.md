# Bitezo frontend — optimization plan (POS + Back Office)

Prepared 2026-11-05. Status: **plan only, nothing implemented yet.** Each phase is shippable on its own
and is guarded by the existing tests (`npx vitest run`, 523 tests incl. `posCrossVerification`).

---

## 1. Where we are (measured)

| Area | Today | Problem |
|---|---|---|
| Size | ~150k lines. POS 55k (terminal alone 35k), reports 30k, transaction 22k, general 20k, inventory 17k | Hard to find things, slow to change |
| Giant files | 11 files > 1,000 lines (`PosRecallDetailsModal` 1,759, `escPosGenerator` 1,694, `PosSettledDetailsModal` 1,528, `DineInTableOrdersModal` 1,478, `orderPricing` 1,313, `usePosCheckoutFlow` 1,304 …) | Every change risks side effects; recall-edit logic exists in 3 copies (bugs found today in 2 of them) |
| Reports | 31 modules, each 6–8 files with its own hook, page, print modal, export util | ~70 % copy-paste; a fix must be made 31 times (the print-reload and "no records on 403" bugs were in all of them) |
| Data layer | 74 `services/` folders + 8 `api.ts`; 8 copies of `unwrap`, 11 of `formatDateOnly`, 6 of `toNumber`, 6 of the paymode-list builder | Same response-shape guessing everywhere |
| Settings | 1,036 direct `localStorage` reads; POS config read from several keys with fallbacks | No single source of truth, untestable |
| UI consistency | 195 distinct hex colours (`#49293e` hardcoded 1,268× although `--color-pos-primary` exists), 1,292 arbitrary `text-[Npx]` sizes | Screens look slightly different; theme changes impossible |
| Lint | 3,904 errors (3,640 `any`) | Type safety mostly off in practice |
| Bundle | xlsx 865 kB, html2pdf 738 kB, jspdf 400 kB, charts 407 kB | Slow first load on POS tablets |
| Good already | Pure pricing engine + 523 tests, lazy routes (105), React Query, shared `money.ts` | Keep and build on these |

---

## 2. Principles

1. **Feature-first, layered inside a feature**: `ui` (components) → `model` (hooks/state) → `api` (requests + mapping) → `lib` (pure logic, tested).
2. **Pure logic out of components.** Money, mapping, validation = pure functions with tests (the pricing engine is the model to copy).
3. **One way to do each thing**: one HTTP client + response unwrapper, one settings store, one report framework, one print service, one design system.
4. **Strangler, not rewrite.** Move one module at a time behind the same route; old and new can live side by side. Never a big-bang branch.
5. **Every step keeps `vitest` + `tsc -b` green**; the POS cross-verification suite must pass before any pricing/mapper move.

---

## 3. Target folder structure

```
src/
  app/                      # bootstrap only
    providers/              # Query, Redux, Toast, ErrorBoundary, AppStatusBanner
    routes/                 # route table split per area: pos.routes.tsx, backoffice.routes.tsx, public.routes.tsx
    store.ts
  shared/                   # used by both POS and Back Office (no feature imports allowed here)
    api/                    # http.ts (axios instance), unwrap.ts, queryKeys.ts, errors.ts
    config/                 # settings store: typed getters for posConfigs / company / device (replaces raw localStorage)
    lib/                    # money.ts, date.ts, html.ts, print.ts, currency.ts, validation helpers
    ui/                     # design system: Button, Input, Select, Modal, Drawer, DataTable, Numpad, Keyboard, Toast, EmptyState …
    hooks/                  # useDebounce, usePermissions, useBranchScope, useHotkeys
  pos/                      # POS product (was features/pos)
    pricing/                # unchanged — pure engine (+ tests next to it)
    orders/                 # cart, place/update order, recall, settled, edit, split, combine, void
      api/  model/  ui/  lib/
    payment/                # cash, card, credit, multi-pay, bulk settlement
    printing/               # ESC/POS, HTML receipt, KOT routing, printer agent client (was qzService)
    menu/                   # groups, categories, products, extras/modifiers screen, happy-hour application
    session/                # cashier in/out, day/shift, denominations, pay in/out
    customers/              # delivery customers, addresses, drivers, providers
    terminal/               # the page shell only: layout, top bar, action buttons, modal host
  backoffice/               # Back Office product (was features/general|inventory|transaction|reports|company|dashboard)
    masters/                # general + inventory masters (one folder per entity)
    transactions/           # purchase, returns, vouchers, stock, production (shared purchaseCalc / voucherCalc / stockCalc in lib/)
    reports/                # ONE report framework + report definitions (see §5)
    company/  dashboard/  users/  settings/
  auth/                     # login, cashier login, registration, onboarding
  tests/ → move each test next to its code (pos/pricing/__tests__ …); keep cross-feature suites in tests/e2e-logic/
```

Rules enforced by ESLint (`eslint-plugin-boundaries` or `import/no-restricted-paths`):
`shared` imports nothing from `pos`/`backoffice`; `pos` and `backoffice` never import each other (move common code to `shared`);
inside a feature, `ui` may import `model`/`lib`, `lib` imports nothing UI.

---

## 4. POS optimization

### 4.1 Structure / code
| # | Change | Why | Effort |
|---|---|---|---|
| P1 | **One "saved order → cart" loader** (`pos/orders/lib/loadSavedOrder.ts`) used by Recall-Edit, Recall-Settle, Settled-Edit, Combine | 3 diverging copies today; 2 had the amount-bill-discount bug | 3–4 d | **DONE 2026-11-05** (AGENT.md §11.6; Combine left as is) |
| P2 | Split giant modals into screen + sections + hooks: `PosRecallDetailsModal`, `PosSettledDetailsModal` (shared `SavedOrderView`), `DineInTableOrdersModal`, `PosCashierSessionModal`, `PosTerminalPage` | 1,000–1,800-line files | 5–7 d |
| P3 | `usePosCheckoutFlow` (1,304 lines) → `useSettle` (state machine: idle → paying → saving → printing → done) + pure `buildSettlement()` | Locks/refs scattered; state machine makes double-submit impossible by design | 3 d | **DONE 2026-11-05** (settle lock state machine, AGENT.md §11.8) |
| P4 | Retire legacy pricing: `orderPricing.ts` (names/extras only → small `lineLabels.ts`), `pos-calc.ts`, tolerance-based `getTaxExclusive*` | Last heuristics outside the engine | 2–3 d |
| P5 | Printing module: one `print(job)` API with adapters (Printer Agent WS, Android plugin, browser), templates as pure functions (already tested) | Printing code spread over 8 files | 3 d |
| P6 | Typed `posSettings` store (reads posConfigs once, exposes `vatEnabled`, `priceView`, `decimals` …) replacing ~400 POS `localStorage` reads | Single source of truth; testable | 3 d | **PARTLY DONE 2026-11-05** (device context + price-view getters, AGENT.md §11.7; printers in Phase 3) |
| P7 | Redux only for cart/session state; server data only in React Query (menu, config, recall lists) | Two caches today | 2 d |

### 4.2 POS UI / UX
- **Layout**: fixed 3-zone grid (menu rail | product grid | cart) with breakpoints for 10" tablet, 15" terminal, phone; no `AutoScaleWrapper` zoom tricks.
- **Touch first**: min tap target 48 px, numpad/keyboard from `shared/ui`, no hover-only actions, haptic-style press state.
- **Speed**: product grid virtualised (`@tanstack/react-virtual` already installed), images lazy + fixed aspect; prefetch the next category.
- **One modal system**: drawer for long tasks (extras, recall, settle), dialog for confirms; same header/footer, Esc/Enter handled by one `useHotkeys` with a modal stack (fixes the Esc-clears-cart class of bugs for good).
- **Keyboard flow** for desktop cashiers: F-keys / numbers documented in a help overlay.
- **Status always visible**: network, printer agent, shift/day, pending prints (top bar chips).
- **Receipt/KOT preview** uses the same template as the print.

---

## 5. Back Office optimization

### 5.1 Report framework (biggest win: ~30k → ~8k lines)
One generic engine + a small definition per report:
```ts
defineReport({
  id: "salesReport", title: "Sales Report", permission: "Sales Report",
  filters: [branch(), dateRange(), paymode(), customer(), series()],
  fetch: (f) => api.get("/reports/sales", { params: f }),
  columns: [col.text("vchNo"), col.date("date"), col.money("netAmount", { total: true }) ],
  print: { orientation: "portrait" }, export: ["xlsx", "pdf"],
});
```
The framework gives every report: filters with local-date defaults, loading/empty/**error** states, totals row (exact `money.ts`),
print (iframe, no reload), Excel/PDF export (lazy-loaded), column chooser, saved filters. Migrate 2–3 reports per day.

### 5.2 Masters (general + inventory)
- One `MasterPage` pattern: list (DataTable with search/sort/paging) + form drawer, driven by a zod schema and an api object.
- Replace per-module `services/` with a generic `createResourceApi("/category")` (list/get/create/update/delete + unwrap) — removes the 8 `unwrap` copies.

### 5.3 Transactions
- Shared `DocumentForm` for purchase invoice / return / stock adjustment / physical entry / transfer / production: header, line grid
  (keyboard-driven), totals panel, payment panel — calculations only from `purchaseCalc` / `stockCalc` / `voucherCalc` / `productionCalc`.
- `usePurchaseInvoice` (917) and `usePurchaseReturn` (1,217) → shared `usePurchaseDocument(kind)`.
- Vouchers (4 screens) → one `VoucherForm(kind)`.

### 5.4 Back Office UI
- App shell: collapsible sidebar grouped by area, breadcrumb, global search (Ctrl+K) for screens and documents.
- DataTable standard: sticky header, right-aligned money columns with tabular numbers, totals row, CSV/XLSX export.
- Forms: 2-column desktop, 1-column tablet; inline validation; unsaved-changes guard.
- Dashboard: KPI tiles + 2–3 charts, date range, branch scope.

---

## 6. Design system (shared by POS and Back Office)

1. **Tokens** in `index.css` `@theme`: colours (primary `#49293e`, accent `#ff9500`, success, danger, warning, neutral scale), radius, shadow,
   spacing, and a **type scale** (xs 11 / sm 13 / base 15 / lg 18 / xl 22 / 2xl 28) replacing 1,292 `text-[Npx]`.
2. Codemod: replace `#49293e` → `pos-primary` etc. (scripted, reviewed per folder), then forbid raw hex in TSX via ESLint rule.
3. `shared/ui` components with variants (size, intent) — Button, Input, Select, Combobox, Modal, Drawer, Tabs, DataTable, Badge, Numpad,
   Keyboard, EmptyState, Skeleton. Existing `components/common` is migrated into it (**needs the owner's permission — `src/components` is protected by the project rules**).
4. Dark/light not required now; tokens make it possible later.
5. Storybook (or a `/dev/ui` page) to see every component in every state.

---

## 7. Performance

| Item | Action | Target |
|---|---|---|
| Heavy libs | `xlsx`, `jspdf`, `html2pdf`, `html2canvas`, `recharts` only via dynamic `import()` from export/print/dashboard | POS initial JS < 400 kB gz |
| Menu | virtualised grid, image `loading="lazy"`, WebP thumbnails from backend | 60 fps scroll on tablet |
| Re-renders | memoised selectors per cart line (`createSelector` by id), `React.memo` on cart rows and product tiles | Cart edit < 16 ms |
| Network | React Query `staleTime` per resource, prefetch on hover/focus, request de-dup | — |
| Fonts | self-host Outfit/Inter (offline terminals) | no external font request |
| Build | keep manual chunks, add `vite-bundle-visualizer` to CI | regressions visible |

---

## 8. Quality gates

- ESLint: turn `no-explicit-any` into a ratchet (count may only go down per PR), enforce `react-hooks/exhaustive-deps`, `no-empty`, import boundaries.
- Tests next to code; keep `posCrossVerification` as a required check; add the same randomized approach for purchase documents and reports totals.
- Add Playwright smoke flows (login → order → settle → print preview; purchase invoice save; one report) against a mock API.
- CI (GitHub Actions): `tsc -b`, `vitest`, `eslint` ratchet, build, bundle size check.

---

## 9. Roadmap (one developer, incremental; dates are working days)

| Phase | Content | Days | Risk control |
|---|---|---|---|
| **0. Foundations** | `shared/` (api/http, unwrap, date, money, print, settings store skeleton), path aliases (`@shared`, `@pos`, `@bo`), ESLint boundaries + ratchet, CI | 4–5 | no behaviour change; tests green | **DONE 2026-11-05** (see AGENT.md §11.5) |
| **1. Design tokens** | tokens + type scale, codemod colours/sizes, `shared/ui` Button/Input/Modal/Drawer/DataTable | 6–8 | visual check per screen; screenshot diff on 10 key screens |
| **2. POS core** | P1 saved-order loader, P3 settle state machine, P6 settings store, modal stack + hotkeys | 8–10 | cross-verification + regressions must pass; one real-terminal shift test | **DONE 2026-11-05** (2a–2d, AGENT.md §11.6–11.9) |
| **3. POS UI** | 3-zone layout, virtualised menu, split giant modals (P2), printing module (P5) | 10–12 | terminal test on tablet + desktop + Android |
| **4. Report framework** | engine + migrate 31 reports (2–3/day) | 12–15 | totals compared old vs new on the same data (snapshot test per report) | **IN PROGRESS** — framework + 10/31 reports (AGENT.md §11.10) |
| **5. Back Office forms** | `MasterPage`, `DocumentForm`, `VoucherForm`, resource API | 10–12 | each document saved old vs new → identical payload (payload snapshot tests) |
| **6. Clean-up** | remove legacy (P4), move tests next to code, delete old folders, lint ratchet to < 500 `any` | 4–5 | — |
| **Total** | | **≈ 55–65 days** | ship after every phase |

Order matters: Phase 0 makes the rest cheap; Phase 2 before Phase 3 because UI work on top of the duplicated loaders would multiply bugs.

---

## 10. Definition of done (per phase)

- `npm run test:pos-safety` green with NO snapshot changes (golden master of the current POS flow, see AGENT.md §9).

- `npx tsc -b` clean, `npx vitest run` green (incl. `posCrossVerification`), build OK, lint count not higher than before.
- No change in saved payloads unless intended (payload snapshot tests).
- AGENT.md updated (file map, rules) in the same PR.
- POS phases: one real shift on a terminal + printer (web Printer Agent and Android) before merge to `main`.

## 11. Decisions needed from the owner

1. Approve moving `src/components/common` → `shared/ui` (protected folder).
2. Path alias names (`@shared`, `@pos`, `@bo`) and whether to rename folders now (big diff) or only for new/migrated code.
3. Report framework: build in-house (recommended, fits current API) vs a grid library (AG Grid Community / TanStack Table — TanStack recommended if a library).
4. Storybook vs a simple `/dev/ui` page.
5. Which phase first if time is short — recommendation: **0 → 2 → 4** (stability and the biggest duplication), UI polish after.

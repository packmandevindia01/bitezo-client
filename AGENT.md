# AGENT.md — Bitezo POS + Back Office (frontend)

Guide for any AI agent or developer working on this app. Sections 1–9 cover the POS terminal
(`src/features/pos/`); section 10 covers the Back Office (everything under `/dashboard`); section 11 covers the
whole project (layout, environments, build, deploy); section 12 is the **production-readiness audit** (2026-11-05).
The optimization plan (folder structure, UI / design system, report framework, roadmap) is in `OPTIMIZATION_PLAN.md`.
**All POS money calculations happen in the frontend.** The backend only stores what we send
(exclusive values) and returns it. A pricing bug means real money is lost, so read the
"Calculation rules" section before changing anything that touches a price.

General project rules (git, shared components, architecture) live in `GEMINI.md` and still apply:
- Never revert, reset, restore or discard code (`git checkout/restore/reset/revert/clean`) without explicit permission.
- Never edit shared components in `src/components/` without explicit permission.

---

## 1. Tech stack

- React 19 + TypeScript + Vite, Tailwind 4
- Redux Toolkit (`src/app/store.ts`, POS state in `terminal/store/posSlice.ts`)
- TanStack Query for menu / config fetching
- axios (`axiosInstance`, JWT from `localStorage.accessToken`)
- Printing: own **Bitezo Printer Agent** (`PrinterAgent.exe`, WebSocket) on web/Windows; Capacitor native `BitezoPrinterPlugin` (raw ESC/POS TCP :9100) on Android. **QZ Tray is NOT used** (only legacy names `qzService.ts` / `connectQZ` remain)
  - When no agent address answers, `utils/printAgentDiagnosis.ts` says why (2026-11-11): Chrome's Local Network Access permission set to Block, the POS opened from an internet address (Chrome then blocks `ws://localhost`, error `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`), or the agent not running. Printer settings shows it as a notice with Check again (`checkPrintAgent`). Permanent fix for tills (proven on Chrome 157, 2026-11-12, POS on plain http from a public IP): `LocalNetworkAccessRestrictionsTemporaryOptOut`, `OverrideSecurityRestrictionsOnInsecureOrigin` (exact POS page addresses — allow-lists only apply to secure pages), and the allow-lists `LoopbackNetworkAllowedForUrls` + `LocalNetworkAllowedForUrls` + older `LocalNetworkAccessAllowedForUrls`; then a full Chrome restart (`chrome://restart`) — `scripts/chrome-printer-access/` (`allow-pos-printing.reg`, `allow-pos-address.ps1`, README), set once per till.
- Vitest (`src/tests/`, 109 files / 1375 tests, all passing on 2026-11-10; node by default, jsdom + Testing Library only where a file asks for it)

Verify every change with:
```
npx vitest run      # all pricing / mapper / print tests
npx tsc -b          # type check (IDE diagnostics are unreliable in this repo)
```

---

## 2. Architecture

```
src/features/pos/
  pricing/                 ← PURE pricing engine. The single source of truth for all math.
    types.ts               rules R1–R9 (documentation + types)
    engine.ts              priceLine, priceBill, allocateProportionally (exact decimal, 14 dp)
    money.ts               re-exports src/utils/money.ts: decimal.js maths, round (14 dp half-up), sums
    settings.ts            buildPricingSettings, isDineInOrderType, isDeliveryOrderType
    cartLine.ts            cart item → engine input (inclusivity, VAT rate, extras, discount)
    storedOrder.ts         saved-order math: derive saved rates, Inclusive view, footer,
                           restore discounts for editing, merge recall+menu endpoints
  services/
    orderApi.ts            POST/PUT /menu/order, recall, void, combine, split
    salesInvoiceApi.ts     POST/PUT /sales-invoices (settle), sales-data
    settledOrdersApi.ts    settled list / details / print data / cancel
    storedOrderView.ts     ALWAYS fetch saved orders Exclusive; build Inclusive view locally;
                           applyStoredPricingToCartItems / resolveRecalledBillDiscount (edit)
    menuApi.ts, posConfigApi.ts, dineInApi.ts, printerSettingsApi.ts, qzService.ts (= Printer Agent client, legacy name)
  terminal/
    store/posSlice.ts      cart, order type, discounts, editing state, void lists
    store/posSelectors.ts  selectCartCalculation → calculateOrder (the cart totals on screen)
    utils/billing.ts       config readers (localStorage) + adapters over the engine
                           (calculateOrder, calculateLineItem, getBillingConfigForOrder)
    mappers/orderPayloadMapper.ts    cart → order payload (new / update / direct settle)
    mappers/invoicePayloadMapper.ts  order payload + payments → sales-invoice payload
    utils/savedOrderToCart.ts       THE saved order → cart loader (Phase 2a): buildSavedOrderLoad (pure) +
                           dispatchSavedOrderLoad; modes settledEdit / recallEdit / recallSettle
                           (used by loadSettledOrderIntoCart, PosRecallDetailsModal edit + settle, Dine-In table edit)
    mappers/orderDetailToCartMapper.ts, utils/loadSettledOrderIntoCart.ts  saved order → cart
    hooks/usePosCartActions.ts   place / update order, KOT printing
    hooks/usePosCheckoutFlow.ts  settle (cash / card / credit / multi-pay), settle prints
    pages/PosTerminalPage.tsx    the terminal screen; its actions are hooks (split 2026-11-13):
                           usePosOrderAction (ORDER), usePosSettleAction (SETTLE), usePosItemEdits (price / qty /
                           complimentary; qty-reduction voids in utils/qtyReductionVoid.ts), usePosProviderTender
                           (provider order, payment method). Order and Settle pick the employee with
                           pos/utils/actionEmployee.ts resolveActionEmployee: waiter, then default employee, then ask
    components/modals/system/cashierSession/  open / close day and shift (split 2026-11-13): useCashierSession
                           (state, server steps, pending-order check, Shift End / Day End prints, logout) + screens
    hooks/menu/useProductSelection.ts  add product: promo/happy hour, alternatives, isIncl
    hooks/useSplit*.ts, usePosVoidFlow.ts, usePosDiscountFlow.ts, usePosRecall.ts, usePosSettled.ts
    components/            UI only (cart, menu, modals/*)
  utils/
    printPricing.ts        numbers for every print (saved order or live cart)
    printPricing.ts        Print pricing: saved orders, live carts, plain rows
    guestPrintTemplate.ts, kotTemplate.ts, deliverySettlePrintTemplate.ts
    printBarcode.ts, cashDrawer.ts, settlePrintConfig.ts   receipt barcode, drawer rule, Settle Print setting
  bulkSettlement/, cashier/, customer/, lockItem/, payInOut/   (other POS modules)
```

### Data flow

```
posConfigs (API) ──► localStorage ──► billing.ts getters ──► PricingSettings
                                                                │
cart items (Redux) ──► cartLine.ts ──► engine.priceBill ◄───────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
     posSelectors (screen)     orderPayloadMapper (save)      printPricing (live-cart print)
                                          │
                                   invoicePayloadMapper (settle)

saved order (API, priceView=Exclusive) ──► storedOrder.ts / storedOrderView.ts
      ├─► recall screen / settled screen footer (storedOrderFooter)
      ├─► edit: rebuild cart lines exactly (applyStoredPricingToCartItems)
      └─► prints (buildPrintPricing)
```

**Rule: the screen, the saved payload and the print must use the same engine result.**
`calculateOrder` (billing.ts) is the only adapter the cart, payload mapper and split modal use.

---

## 3. Configuration (where the inputs come from)

On terminal start `useTerminalInit` fetches `GET /pos-config/{branchId}/pos-config-data`, stores
it as `localStorage.posConfigs` and mirrors some fields as direct keys.

| Setting | Read by | Source priority | Notes |
|---|---|---|---|
| VAT on/off | `getVatStatus()` | `posConfigs.vatStatus` → legacy keys (`vatStatus`, `enableVat`) → configured rate > 0 | config always wins over stale direct keys |
| VAT rate | `resolveVatRate()` | `item.savedVatRate` → product `vatValue` → default | default = config `vat`, else **10%** |
| Service charge % | `getBillingConfig()` | `posConfigs.serviceCharges` | **Dine-In only** (0 for every other order type) |
| Levy % | `getBillingConfig()` | `posConfigs.levy` | all order types |
| Price View | `getPriceView()` | `localStorage.priceView` → posConfigs → `"Inclusive"` | **display only**, never changes math |
| Print Price | `getPrintPrice()` | `localStorage.printPrice` → posConfigs → Price View | what prints show |
| Discount Calc | `getDiscountCalculation()` | `discCalc`/`discountCalc` → posConfigs → Price View | how a typed **fixed** discount is read |
| Delivery charge | `getStoredDefaultDeliveryCharge()` | posConfigs → direct keys | overridable per order (`customDeliveryCharge`) |
| Decimals | `getDecimalPart()` | `localStorage.decimalPart` | display/print rounding only (live: 3) |
| Item separation | `isItemSeperationEnabled()` | posConfigs | if on, same product adds a new row |
| Standard KOT Print | `executeKotRouting` | posConfigs `kotPrint` (no value = on) | station KOTs on every order, re-order and void print (§6.8) |
| Cash Drawer | `isCashDrawerEnabled()` | posConfigs `cashdrawer` = `Enable` | old `Default` / `Normal` values mean off (§6.8) |
| Settle Print, Ask Before Printing | `getSettlePrintConfig()` | `localStorage.settlePrintConfig`, **this device only**, not on the server | no value = print directly (§6.8) |

Live configuration at time of writing: VAT on, 3 decimals, Price View / Print Price / Discount Calc
all `Inclusive`.

Order types (one server list, `GET /pos-config/order-type-list-name`): `1 DineIn, 2 TakeOut, 3 DriveThru, 4 Delivery`, then every
provider by its OWN id (`5 Swiggy, 6 Zomato, 7 …`). A provider order is saved with orderTypeId = provider id; any id > 4 is a provider
(`pos/utils/providerOrderType.ts`: `isProviderOrderTypeId`, `orderTypeNameFromId`). There is NO "Providers" or "Coming" type on the
server: "Coming" is only the `isComing` column of a Delivery (4) order (fixed 2026-11-13; it used to save as 6 = a provider).
(`ORDER_TYPE_NAMES` in `pricing/storedOrder.ts`).

---

## 4. Calculation rules (R1–R9)

Implemented in `pricing/engine.ts`, documented in `pricing/types.ts`. Do not reimplement them anywhere else.

### R1 — Inclusive vs exclusive is a property of the LINE
Each line has `priceIncludesTax`, decided once by `cartLine.resolvePriceIncludesTax`:
1. the line's own `isIncl` (set from product master, promo/happy-hour flag, alternative, or manual price edit)
2. the product master tag (`isIncl` / `priceIsIncl` / … on cached product, then embedded product)
3. unknown → follow Price View (legacy fallback)

- `true`: unit price already contains VAT + levy + service charge.
- `false`: unit price is the exclusive base; charges are added on top.
- **Price View never changes the math, only what is shown.**

### R3 — Combined factor
```
factor = (1 + sc) × (1 + levy) × (1 + vat)
sc   = serviceChargeRate (Dine-In only, else 0)
levy = levyRate
vat  = line VAT rate, or 0 when VAT is disabled
baseUnitPrice = priceIncludesTax ? unitPrice / factor : unitPrice
productBase   = qty × baseUnitPrice
```

### R2 — Extras
- Extra prices are always gross (inclusive) and converted with the **same factor as their line**:
  `extraBase = extraGross / factor`.
- Extra qty is **per line**, not multiplied by line quantity. The same extra or modifier can be added many times: one entry with a qty (product 10 + 2 × extra at 2 = 14; at line qty 2: 24).
- Voiding one unit of a multi-unit saved line voids no extras: they stay on the line and stay charged until its last unit is voided.
- `amount = productBase + Σ(extraGross × extraQty) / factor` (exclusive line amount before discount).
- Modifiers and messages have price 0.

### R4 — Item discount (taken off the exclusive base, before charges)
```
percentage → discountBase = amount × pct            (pct capped at 100)
amount     → Discount Calc = Inclusive : discountBase = min(typed, amount × factor) / factor
             Discount Calc = Exclusive : discountBase = min(typed, amount)
discountGross = discountBase × factor
```
A discount never exceeds the line amount.

### R5 — Bill discount
- A bill discount **replaces** all item discounts (item discounts are ignored when a bill discount is set).
- Converted to exclusive once:
  - percentage → `totalBase × pct`
  - amount, Inclusive → `typed / (totalGross / totalBase)` (bill average factor)
  - amount, Exclusive → `typed`
- Allocated across lines proportionally to each line's `amount`; the rounding remainder goes to the
  largest line so allocations sum exactly (`allocateProportionally`).

### R6 — Charges cascade on the discounted base
```
netValue  = amount − discountBase
sc        = netValue × scRate
levy      = (netValue + sc) × levyRate
vatBase   = netValue + sc + levy          (backend vatExclAmount per line)
vatAmount = vatBase × vatRate
lineNet   = vatBase + vatAmount           (what the customer pays for the line)
```
Order: **service charge → levy → VAT**. (`terminal/utils/pos-calc.ts` uses a different order — it is
only imported for its `allocate` helper; do not use its calculation.)

### R7 — Delivery charge
Added to the grand total after VAT, not taxed. Applies only when order type is Delivery (id 4).
```
grandTotal = Σ lineNet + deliveryCharge      (backend netAmount)
```

### R8 — Precision (14 decimals, rounded — never truncated)
- All arithmetic is **exact decimal** (`decimal.js`, 40 significant digits) in `src/utils/money.ts`
  (`dec`, `round`, `sumDec`, `sumMoney`, `toNum`); `pricing/engine.ts` and `billing.roundCalc` use it.
- Every stored / calculated amount keeps **14 decimals** (`CALC_PRECISION = 14`), **rounded half-up**
  (away from zero). Never truncate: cutting off loses value in one direction (12.705 incl. → base
  9.99999999999999 → shows 9.999). Rounding at 14 dp moves a value by ≤ 0.000000000000005 → shows 10.000.
- Only display / print / amount-to-pay round to the currency decimals (fils), also half-up
  (`utils/formatters.ts`, `utils/currency.ts` → `money.round`). Display rounding first removes float noise at
  12 dp (69.87749999999999 → 69.878).
- Totals are exact decimal sums of the 14-dp line values — never `a + b` on JS numbers for money totals, and
  keep partial totals as decimals until the end (see `invoicePayloadMapper`).
- Payments are compared with the total at the currency decimals (`PosCashTenderModal`, `PosMultiPayModal`).
- **Exception — product details `netAmount` is sent with 7 decimals** (half-up, `DETAIL_NET_PRECISION = 7`,
  `withDetailNet7` in `utils/money.ts`). It is applied only at the API boundary, at every request that sends
  `details[]`: `POST /menu/order`, `PUT /menu/order/{id}`, `POST /order-split` (each order),
  `POST /sales-invoices`, `PUT /sales-invoices/{id}`. Every other detail column, the master totals and all
  calculations stay at 14 dp, so Σ detail `netAmount` may differ from the master `netAmount` by ≤ 0.00000005
  per line. Reading a saved order back is not affected: the readers compare line `netAmount` with tolerances
  of 0.01 or more. Test: `detailNet7.test.ts`.
- Known limits: a JS number holds ~15–16 significant digits, so for amounts ≥ 100 the 14th decimal is limited
  by the number type wherever a value leaves the engine (payloads; the backend DTOs are `double`). Σ of lines
  that were each rounded at 14 dp can differ from the exact bill value by 1e-14 (never visible).
  Orders saved before this change carry 7-dp values; restored values show that noise (e.g. 14.99999996).
- Tests: `precision14.test.ts` (truncation cases), `purchaseCalc.test.ts`, `displayBalance.test.ts`.

**Display balancing (decided in the frontend, 2026-11-04)**
- VAT rule: **per line** (each line its own VAT rate; the bill VAT is the exact Σ of line VAT).
- Every footer that is shown or printed is balanced to the fil with `balanceBillFooter` (largest remainder):
  Sub Total − Discount + Charges = Net Value and Net Value + VAT + Delivery = Grand Total always add up.
  Printed bills split Charges into `Service Charge (10%)` then `Levy (5%)` (`utils/printCharges.ts`); the two lines sum to the balanced Charges. Screens still show one Charges line.
  Grand Total = exact payable rounded (matches the payment screen); other rows move ≤ 1 fil. Used by the cart
  footer (`PosOrderSummary`), the guest / settle bill (`guestPrintTemplate`), Recall and Settled previews.
- Exclusive print: row amounts are balanced to the footer Sub Total, item discounts to the footer Discount.
  (Inclusive print rows carry VAT and the footer Sub Total never does, so they are not meant to add up.)
- Display only: nothing stored, sent or charged changes. Safety: numbers that do not belong together
  (off by more fils than there are rows) are shown plainly rounded, never forced.
- Database precision is unknown; the frontend never depends on it: saved orders are re-read and their rates
  derived from what comes back (7-dp orders are covered by tests), and everything shown is rounded to fils.
- 5-fil cash rounding: NOT applied. It would change the amount charged, and the sales-invoice DTOs
  (`CreateSalesInvoiceDto` / `UpdateSalesInvoiceDto`) have no rounding / adjustment field to record it.

### R9 — Backend stores exclusive values only
Per detail line: `price` (exclusive unit incl. extras = amount/qty), `discAmount`, `discPer`,
`serviceCharge`, `levy`, `vatAmount`, `netAmount` (= lineNet).
Per modifier row: `price` = exclusive extra unit price, `amount` = price × qty.
Master: `discAmount` (bill discount only, else 0), `discPer`, `serviceCharge`, `levy`,
`vatExclAmount` (Σ vatBase), `vatAmount`, `netAmount`, `deliveryCharge`.
Master totals are **sums of the detail rows**.

### Worked example
Dine-In, sc 10%, levy 5%, VAT 10% → factor = 1.1 × 1.05 × 1.1 = **1.2705**

| Step | Value |
|---|---|
| Inclusive product 12.705 × qty 2 | base unit 10 → productBase 20 |
| Extra 1.2705 (gross) × 1 | extraBase 1 → amount 21 |
| Item discount 10% | discountBase 2.1 → netValue 18.9 |
| Service charge 10% | 1.89 |
| Levy 5% of 20.79 | 1.0395 |
| vatBase | 21.8295 |
| VAT 10% | 2.18295 |
| lineNet | **24.01245** (= 18.9 × 1.2705) |

Same line with a typed fixed discount of 2.541 and Discount Calc = Inclusive → discountBase = 2.541 / 1.2705 = 2.

### Complimentary
100% discount (item or bill) → `complimentaryStatus = true`; VAT is not charged on complimentary
orders in the invoice mapper.

---

## 5. Saved orders (recall, settled, edit, print)

File: `pricing/storedOrder.ts`, `services/storedOrderView.ts`.

1. **Always fetch with `priceView=Exclusive`** (`STORED_ORDER_PARAMS`). Never send sc/levy in the URL.
   The backend's Inclusive conversion uses current settings and is wrong for older/Dine-In orders.
2. **Rates come from the order itself**, not current settings: `storedLineRates` derives each line's
   sc/levy/VAT % from its stored amounts (snapped to 3 dp), preferring the line's stored `vatValue`
   and master-derived rates when within 0.1 (handles orders stored with rounded line values).
   Current settings are only a fallback for lines with no positive net (100% discount).
3. **Inclusive view** = stored exclusive `price/amount/discAmount/modifier price × line factor`
   (`toInclusiveView`).
4. **Two endpoints are merged** (`mergeStoredOrderSources`): `/order/recall/order_data/{id}` (prices,
   extras) + `/menu/order/order_data/{id}` (vatValue, vatId, discPer, netAmount, complimentaryStatus).
5. **Duplicate extra rows** returned by the backend are removed (`dedupeModifierRows`).
6. **Service charge / levy totals come from the lines** (`storedOrderCharges`); the master can be stale after an update.
7. **One footer** (`storedOrderFooter`) is used by the recall screen, settled screen, recall-edit and
   settled-edit — rule **"edit = screen"**:
   `subTotal = vatExclAmount − charges + discount`.
8. **Editing keeps the saved rates**:
   - `posSlice.editingOrderRates` = sc/levy derived from the saved order (`deriveOrderChargeRatesFromMaster`);
     `getBillingConfigForOrder` uses them for both the cart selector and the payload mapper.
   - Each line keeps its saved VAT % in `item.savedVatRate` (beats product VAT).
   - Cart lines are rebuilt by `applyStoredPricingToCartItems` so the engine reproduces the stored values
     exactly (price in the product's own inclusivity, extras as gross, item discount as % only when the
     stored `discPer` reproduces `discAmount` exactly, else as amount).
   - Bill discounts are restored by `resolveRecalledBillDiscount` (same % on every line → percentage,
     otherwise fixed amount in Discount Calc terms).
   - Combine still uses current settings.
9. **Authoritative totals**: while an edited order is unmodified (`isCartModified = false`) the selectors
   show the stored totals (`authoritative*` fields in the slice). Any cart change switches to the engine —
   including a change of ORDER TYPE (`setOrderType` / `setOrderTypeByName` also drop `editingOrderRates`),
   so e.g. Dine-In → Take Out removes the service charge on screen and in the saved order.

---

## 6. POS workflow

### 6.0 Order employee and customer (owner's rule, 2026-11-12, applies to EVERY order and screen)
- **Employee** of an order = the employee whose code was punched when it was placed (employee authentication), or the
  terminal's **default employee** when no code was asked. Either way it is saved as the order's `employeeId`; show the name of
  that id. An order with no employee id was placed by the default employee. Never show another device's / the logged-in
  employee for an order that has an id. (The Dine-In waiter selected on the order is a separate field.)
- **Customer** = the customer selected on the order; none selected = **Cash Customer**.
- Code: `utils/employeeNames.ts` — `resolveEmployeeNameForPrint(empId, savedName)` (async: saved real name → name of the id via
  cache / authorized employee with that SAME id / branch list / employee by id → "Waiter"; no id → default employee) and
  `savedOrderWaiterName` (same rule, no server calls). Used by: Recall details (shows at once, looks up by id when unknown), Recall
  bill + KOT reprints, new-order KOT and settle receipt (`usePosCartActions`, `settleReceiptData`), table / settled prints, Dine-In
  settle, settled-order load, Split header. NOT bulk settlement's "settled by" (that is the person settling now).

### 6.1 Terminal start
`useTerminalInit` → load POS config, branch print data, employee map, default employee; cashier
session/day/shift (`cashier/`) must be open before orders.

### 6.2 Build the cart
- Menu: groups → categories → sub-categories → products (`menuApi`, cached into `productCache`).
- Add product (`useProductSelection` → `addToCart`):
  - **Happy hour / promo**: if `promoPrice > 0` it becomes the line price, with the backend's `promoIsIncl` flag.
  - **Alternatives (variants)**: own price, own `isIncl`, own `vatValue`.
  - Same product + variant + price + discount and no customisations merges into one row, unless item separation is on.
- Line actions: qty (`updateItemQty`), price edit (`updateItemPrice`, sets `isIncl` from the keypad or Price View),
  item discount (`setItemDiscount`, `setAllItemsDiscount`), extras/modifiers/messages (`setItemCustomizations`).
- **Extras / modifiers screen** (`PosExtrasModifierModal`, redesigned 2026-11-05): ONE screen for the whole bill.
  Line prices come from `utils/cartLineDisplay.ts` (`getCartLineDisplay`), the same as the cart rows. Never show `line.price` directly: on a saved order it includes extras only until the cart is first changed.
  Header tabs Extras ↔ Modifiers; right panel lists every cart line (qty / description / price / amount) with its
  extras, modifiers and messages; tap a line to target it ("Adding to #n" bar), tap a grid item to add one, tap again
  for one more (the tile shows ×n); − and + on the right change the qty, − at 1 or the X removes it; ↑ ↓ change line; Esc closes (captured so the global Esc = clear-cart shortcut never fires). Drafts for all
  lines are kept until **Done**, which calls `setItemCustomizations` only for lines that changed; Cancel discards.
  Opens with any non-empty cart (starts on the selected line, else the last one). Grid items are filtered by the
  target line's category. Qty rules are in `terminal/utils/lineCustomization.ts`: one entry per id on a line, saved as one row with its qty. Lowering or removing an extra on a saved order records no void and asks for no permission, same as removing one always did.
  **Unit rail** (2026-11-12, owner's prototype "EXTRAS LIST"): a NEW line of 2+ whole units shows 1…N left of the types. Pick k and tap an
  extra / modifier → k units become their own line (placed right after it) carrying that item × k (one per unit); the cashier stays on
  that line with k picked. Picking N = × N on the same line; nothing picked = one per tap on the whole line (as before); tap the picked
  number again to un-pick. Splits are drafts until Done, which dispatches `splitCartLine` (posSlice: same price / VAT / % discount, an
  amount item discount shared pro-rata) first, then `setItemCustomizations`. A split line whose extras end up the same as its parent's is
  not split. Existing extras on the parent move pro-rata only when they divide evenly (`splitCustomizations`), otherwise stay; messages
  stay on both. Lines sent to the kitchen (`isExisting` / `mapId`) never split (owner's choice): no rail, "Sent to kitchen · goes on all".
  Tests: `extrasUnitSplit.test.tsx`.
- Bill discount: `setBillDiscount` (replaces item discounts, R5).
- Delivery: customer + address required; delivery charge editable (`setCustomDeliveryCharge`). The footer shows
  Delivery Charge AFTER VAT (it is not taxed, R7); one tap opens `PosDeliveryChargeModal`, which lists only the
  configured zones (`posConfigs.deliverycharges`), else the configured default charge — never invented sample zones.
- Dine-In: section + table required; waiter, guest count.
- Totals on screen: `selectCartCalculation` → `calculateOrder` → `priceBill`.

### 6.3 Place order (KOT)
`usePosCartActions.submitOrder` → `buildNewOrderPayload` → `POST /menu/order` (retries on ticket conflict)
→ KOT print per printer routing (category / product / section / order type) → clear cart.
The action row above it (Clear, Customer, Waiter, Split, Combine, Recall, More) is `PosActionButtons`, colours and animation in `.pos-action-btn` (`index.css`).
The footer has one Order and one Settle button (`PosOrderSummary`; Order & Print / Settle & Print were removed). Order follows Standard KOT Print, Settle and Update follow Settle Print (§6.8).
Order / ticket numbers are assigned by the backend: read the save reply with `readCreatedOrder`
(`services/orderResponse.ts`, accepts any reply shape), then the saved order (`getOrderDetails`).
Never print a guessed number; templates use `toDisplayNo` so a missing value prints blank, not "undefined".

### 6.4 Recall & edit
Recall list `GET /order/recall` → details (merged endpoints, Exclusive) → `PosRecallDetailsModal`
shows `storedOrderFooter`.
The Recall details and Settled details windows share their ticket view: `components/modals/savedOrder/`
(`SavedOrderTicket.tsx`: window frame, meta fields, item-discount row, extras / modifiers / messages,
delivery block, totals, buttons; `lineModifiers.ts`: dedupe + split of a line's modifier rows). Their big
routines live in `terminal/utils/`: `loadSettledOrder.ts` (settled details + invoice + print data + order merge),
`printSettledOrder.ts` (settled PRINT), `printRecallKot.ts` (recall KOT), `printRecallOrder.ts` (recall GUEST),
`recallListText.ts` (list-row text fallback). Test `savedOrderWindowsSnapshot` renders both windows: a
change to what they show must update its snapshot on purpose.
Dine-In table orders (`DineInTableOrdersModal`): `GET /menu/dine-in/tables/{tableId}/orders` (fetched
Exclusive) gives the table's orders. Since 2026-11-12 (owner's request) they show as side-by-side CARDS (`dining/TableOrderCard.tsx`),
each the Recall preview's own ticket (`savedOrder/SavedOrderTicketBody.tsx`, loaded in full by `utils/loadRecallOrder.ts`
`fetchRecallOrderData`, the same loader the Recall preview uses; reloaded when the order total changes on the 10 s refresh).
Tap a card = select; action column NEW/ASSIGN · EDIT · SETTLE · KOT · GUEST · CLOSE works on the selected card; DETAILS / double-click /
Enter opens `PosRecallDetailsModal`, whose Edit / Settle are routed back to the table screen's Dine-In flows via `onEditRequest` / `onSettleRequest`.
The Printed badge still comes from the Recall list (`GET /order/recall?OrderTypeId=1`). Edit → `loadRecalledOrder` (see §5.8).
The table screen's code outside the window (2026-11-11): `utils/loadDineInOrder.ts` (order → cart items),
`utils/dineInSettlement.ts` (`buildDineInSettleOrder`: invoice order from the STORED order; `printDineInSettleReceipt`),
`utils/printDineInOrder.ts` (row PRINT guest bill), `utils/dineInBillFigures.ts` (footer figures shared by both prints),
`utils/dineInTable.ts` (reserved check, row text, `paymodesToTenderOptions` — also used by the terminal),
`dining/TableOrderRow.tsx`. Test `dineInTableOrdersSnapshot` records the list, the invoice, both receipts and the
cart after Edit.
Save → `buildUpdateOrderPayload` → `PUT /menu/order/{id}` with `prevUpdatedAt` concurrency token
(fetched fresh before the update). Combined groups update the highest order id.
Existing lines keep their `mapId`; new lines get `max(mapId)+1…`. Removed/decreased lines go to
`voidProducts` / `voidModifiers`.

### 6.5 Settle
`usePosCheckoutFlow` (validation, invoice, save with the ticket-clash fallback, drawer, KOT, print question,
settle lock). After the save, the receipt data comes from `utils/settleReceiptData.ts` `buildSettleReceiptPayload`
(settled order read back with fallbacks, line mapping, delivery / driver fields, totals) — split out 2026-11-11;
test `terminalSettleSnapshot` records the invoice and every page printed for five settles.
- Direct settle (new cart) or settle a recalled order.
- `buildDirectSettleOrderPayload` → `buildSalesInvoicePayload` → `POST /sales-invoices`
  (or `PUT /sales-invoices/{saleId}` when editing a settled order).
- Payments: cash (tender + change), card, credit (not allowed for Cash Customer id 1), multi-pay
  (root `paymodeId = 3`, `paymodes[]` list).
- Ticket collision on direct settle → submit the order first, then settle with its id.
- Delivery requires an address.
- Settle print uses `buildPrintPricing` on the stored order.

### 6.6 Settled orders
`GET /settled-orders`, details `/settled-orders/settled-data/{orderId}`, print
`/settled-orders/settled-print-data/{saleId}/{orderId}`, cancel `PUT /settled-orders/cancel-sales-invoice/{orderId}`.
Edit → `loadSettledOrderIntoCart` (`isSettledEdit = true`, `editingSaleId` set) → re-settle updates the invoice.

### 6.7 Split / Combine / Void
- Discounts (`splitCombineDiscountStatus` in `utils/orderDiscountCheck.ts`, 2026-11-11):
  - Business rule: an order has **either** a bill discount **or** item discounts, never both.
  - **Bill discount or bill complimentary** (bill complimentary = 100 % bill discount, saved as master
    `discPer` 100; `checkOrderIsBillComplimentary`), saved on the order or applied in the cart: a warning
    "… will remove it. Continue?". Yes → it is reverted; No → nothing changes. Split asks when the window
    opens; Combine asks on open for the current order and again on Done if a chosen order has one.
    That order's line discounts (and the complimentary flag bill complimentary puts on every line) are the
    bill discount, so they are removed: split via `storedLineToCartPricing(isBillDiscount: true)` +
    `complimentaryStatus: false`, combine via `stripBillDiscountFromCombinedLines` (by the line's `orderId`).
    Lines of the other orders keep their item discounts.
  - **Item complimentary** (master `discPer` 0, line `complimentaryStatus` / 100 %): blocked.
  - **Item discounts**: unchanged.
- Split screen header (2026-11-12): shows which order is split: order no, ticket, type, waiter, table (Dine-In), guests, customer,
  date and saved Order Total (hidden once the bill discount is removed), from `terminal/utils/splitOrderInfo.ts` (`getSplitOrderInfo`:
  saved master first, cart for gaps; employee and customer follow §6.0 (saved name → cached name of `employeeId` → `lookupEmployeeName`; no id → default employee; label "Employee", "—" when not found). Test: `splitOrderInfo.test.ts`.
- Split drag and drop (2026-11-12): double-click still moves ONE unit; dragging a line onto another bill moves its WHOLE qty
  (`terminal/hooks/useSplitDrag.ts`: pointer events; mouse drags after 6px, touch needs a ~0.3s hold so a quick swipe still scrolls;
  Esc cancels; bills marked `data-split-bucket`). `splitDropCheck`: the original order keeps at least one item. Test: `splitDrag.test.tsx`.
- Split (`PosSplitModal`): lines are moved between buckets;
  item discount moves pro-rata per unit; each bucket priced with `calculateOrder` and the saved rates;
  `POST /order-split`.
- Combine (`PosCombineModal`): `GET /order/combine` → `/order/combine/combined-orders` → loaded into cart
  with `combinedOrderIds`; saved/settled against the highest order id.
- Void: whole order `PUT /order/void/{id}`; line/qty voids are recorded as `voidProducts` / `voidModifiers` and
  sent with the update. Voided units are priced by the engine (`pricing/voidLine.ts` `priceVoidedPortion`, order's
  saved rates, before discount): `voidProducts.amount` = exclusive product amount, `voidModifiers.amount` = exclusive
  extra amount (R9). The row keeps its `pricedLine`, so the VOID ITEMS print follows Print Price like any KOT line.

### 6.8 Printing
- Guest bill / settled bill / recall print → `buildPrintPricing` (stored values + each line's saved rates,
  follows **Print Price**, independent of Price View).
- Live cart print → `applyCartPricingToUnified` (numbers taken from the cart engine's `pricedLine`).
- KOT shows no prices.
- Settle Print (POS config, Printing tab): saved in this device's localStorage only (`settlePrintConfig`, `utils/settlePrintConfig.ts`), default print directly. Off = no receipt; on + Ask Before Printing = Yes / No after the sale is saved (`useSettlePrintPrompt`, `SettlePrintPrompt`, Enter = Yes, Esc = No). Applies to checkout Settle / Update and dine-in settle. Not to bulk delivery settlement or manual reprints. The drawer opens regardless.
- Order on an edited order always gives the kitchen a KOT (with Standard KOT on): added lines = RE-ORDER (added only); voids = VOID ITEMS; neither (extras, modifier or note changed, or nothing) = UPDATE KOT with the whole order.
- Standard KOT Print (POS config `kotPrint`) decides station KOTs on every order, re-order and VOID ITEMS print: off = none. Only the manual KOT button in Recall is forced (`forcedPrint`). Master KOT and the packager print follow their own settings.
- KOT Print (Settle) (`terminal/utils/settleKot.ts`): when on, settling sends the kitchen what it has not received (whole cart on a new order, added quantities as RE-ORDER on a saved one), even with Standard KOT Print off.
- Bill header and footer come only from the branch's lines (Branch Master, `/Branch/branches/{id}/print-design-data`, cached in `branchPrintData`; refreshed when the POS opens and when a branch is saved). No fixed closing text. The Branch Master preview is 288px wide, uses `getLineStyle` like the print, and shows the real bill body (`preview/ReceiptSampleBody`).
- Bill Copies (`forEachBillCopy`): how many receipts a settlement prints automatically. Manual reprints from Recall, Settled and Dine-In print one. Printer Settings "Bill Count" is a different setting: copies of the Master KOT on the bill printer.
- Not used by any code yet: Color Change (Guest Print), Item Separation (After Edit), Caller ID Port, Display Port.
- Master KOT (`executeKotRouting`, `isMaster: true`): same KOT template (items, modifiers, delivery block) with
  no totals / VAT; printed once per order or re-order on the master printer (and/or bill printer); never for
  void prints (by design).
- RE-ORDER (edited order sent again): `terminal/utils/reorderItems.ts` — only added quantities; modifiers and
  extras printed as attached (not multiplied by the share of new units).
- Package (packager) print: guest template with `isPackager: true` (title PACKAGER) after an order is placed,
  when POS config `packagerPrint` is on; whole order; balanced footer; `packagerHeader` setting controls the
  company header only (`showCompanyHeader`); the branch footer always prints. Not printed on direct settle (no order placed first).
- Templates: `guestPrintTemplate.ts`, `kotTemplate.ts` (HTML). Every print, web and Android, renders the HTML to a 1-bit raster: Bitezo Printer Agent over WebSocket on desktop, the Android plugin `printRaw` on the app (`qzService.ts`). `escPosGenerator.ts` (plain-text ESC/POS markup) was removed 2026-11-13: its output was never printed. `printEscPosMarkup` and the plugin's `printEscPos` are kept but unused.
- Barcode at the bottom of the guest template (`printBarcode.ts`, Code 128 with the number under it): guest and packager prints encode the order number (first one on a combined order), settle prints encode the **sale id** (`saleId`, not the voucher number; no real id = no barcode). Bars are `<div>`s on whole printer dots, 3 dots wide: tested through html2canvas + the 1-bit threshold, SVG / PNG images and 2-dot bars were less reliable. Scanning a bill on the terminal still goes to the product SKU lookup (`useBarcodeScanner`), so a number equal to a SKU adds that product.
- Cash drawer: cabled to the bill printer, opened by a raw ESC p job (`openCashDrawer` in `qzService.ts`, agent and Android). POS config "Cash Drawer" is saved as `cashdrawer: Enable / Disable` (the field used to be an unused Default / Normal type; old values mean off). `openDrawerIfCash` (`utils/cashDrawer.ts`) runs after the sale is saved, before the receipt, whether or not a receipt prints, when a Cash payment is above 0: checkout, dine-in settle and bulk delivery settlement. Not on an edit of a settled bill, reprints or provider settlements. It waits at most 3 s and only warns on failure. More → OPEN CASH DRAWER (`openDrawerManually`) opens it without a sale: follows the same setting, asks for an employee PIN unless a default employee is active (any valid PIN until the backend adds a privilege, then set `permissionId` in `PosMoreModal`); not logged anywhere.
- Bill discount is printed once in the footer; rows show no per-line discount.
- Delivery orders taken from a missed call (`missedCall`) print "Missed Call : YES" in the DELIVERY DETAILS block
  of the KOT and guest bill; every print-data builder passes `missedCall` (saved order value, else cart state).
- Modifiers show as `<TYPE> <NAME>` ("NO SUGAR", "TEST TEST1") everywhere — cart, recall / settled / dine-in
  previews, KOT, guest bill — via `utils/modifierLabel.ts` (`modifierLabelOf`). Never build the label inline.
  Saved rows with an empty `typeName` use the type remembered per modifier id when the modifier list loaded.

### 6.9 Other modules
Bulk settlement (driver/provider unsettled orders), cashier in/out, pay in/out, lock item, delivery
customers, provider orders (`orderTypeId 5`, customer = provider post account).
Back Office Menu Settings (`general/menuSettings`, 2026-11-12): session hours are All day / Set hours with <input type="time">,
presets, a plain summary ("12:00 PM → 3:00 AM next day · 15 h"), a past-midnight warning, overlap hints and a 24-hour
timeline (`components/SessionTimeline.tsx`, `utils/sessionTime.ts`); the list has an Hours column and a Day overview (it loads
each session's details, the list endpoint has no times). Saved as HH:mm:00; same start and end = all day.
Category branch allocation: an EMPTY branch list means ALL branches (Category Master sends BranchIdsJson "" for All branches
and shows a category with no branches, or every branch ticked, as All branches). Unticking every branch also saves as All.
Menu sessions (Menu Time Settings, checked 2026-11-12): categories are allocated to sessions in Category Master (`menu`
list on the category). Master data lists only the sessions running now (refreshed every 30 s); `/menu/{menuId}/categories`
returns a session's categories (menu 0 = all). `usePosProducts`: a running session shows ONLY its categories (no padding
with master data / Category Master); when the selected session ends the POS moves to the first running one; none running →
menu 0. Products follow their category (the products endpoint has no menuId). Open: branch allocation (a category with no
branch, e.g. Juice, still shows at Main); Category Master saves menu 1 when no menu is picked (`category/api.ts`).
Backend bugs (8060, 2026-11-12, sessions Breakfast 06:00–23:59, Lunch 12:00–03:00, Evening Snacks 15:00–19:00,
Dinner 19:00–00:00): `/menu/master-data?currentTime=` returns EVERY session at any hour (time not applied) and sends no
start / end times; `/menu/0/categories` repeats a category once per session it is in. POS: categories deduped in
`getGroupCategories`; `isMenuSessionRunning` (start = end → all day, end < start → over midnight, end exclusive) filters
master-data sessions as soon as the server sends their startTime / endTime. The POS login gets 403 on menu-time-settings.
Test: `menuSessionMenu.test.tsx`.
Provider menu (checked on backend 8060, 2026-11-12): each provider's id continues after the order types (Swiggy 5, Zomato 6 …).
The menu endpoints (categories, products, product-list, alternatives, product data) take that PROVIDER ID as `orderTypeId`
and return the provider's own products and prices from Provider Settings (with providerOwnStatus on, categories without its
products are hidden). So menu calls use `selectMenuOrderTypeId` (posSelectors: type 5 + `menuProviderId` → the provider id),
synced from PosTerminalPage's activeProvider. The SAVED order keeps orderTypeId 5 + providerId (orderPayloadMapper).
Known backend issues: GET provider-settings/{transId}/provider-settings-data returns each product ~3× with another
product's barcode / alt name (the edit screen dedupes; saving sends only product, unit, price, tax type); a provider with no
settings for the terminal's branch shows an empty menu when providerOwnStatus is on. A recalled provider order restores its provider
(`loadRecalledOrder` payload `providerId` from the saved master, when the backend returns it); `clearCart` forgets it.
Provider own menu ON: the category rail shows ONLY the server's categories for the provider (no padding with master data /
Category Master — `usePosProducts` `providerOwnMenu`).
More backend bugs (2026-11-12, two providers): products by category return EVERY provider's rows (one per provider, only the
price differs), product data returns the first provider's price, alternatives repeat per provider. Correct per provider:
categories and product-list. Workaround in `menuApi` (block "Provider menus"): the provider's product-list decides which
category products show and their price (`fixProviderMenuProducts`, cached 1 min, cleared by `clearAllPosCache`); identical
alternative rows are dropped. Remove it once the backend filters products / product data by provider. Re-check after the backend fix (2026-11-12, only Zomato has settings): provider-settings-data
fixed (no duplicates; products without an alternative now come with an EMPTY code — the Back Office edit screen fills it from
load_products); category products one row each at Zomato's price (two-provider mixing not testable: Swiggy has no settings);
product data STILL returns another provider's price (Swiggy masala dosa = Zomato's 2); alternatives STILL repeat (Chicken
Biriyani "aaa" ×2 with a provider, ×1 without). Workaround kept.
Provider image (2026-11-13): saved with the Back Office provider master. `POST /provider` and `PUT /provider/{id}` are
multipart form data (PascalCase fields, `BranchIds` repeated, `ImageFile`; update also `IsImageChanged`: true for a new file or a
removed image), built by `buildProviderForm` in `providerService`; the old `/provider/provider-image` call is gone. Read by the POS
provider picker from `GET /menu/providers` → `imageUrl` (`menuApi.getProviders`, also accepts `fileUrl` / `filePath`). Both the
picker and the Back Office edit preview pass the path through `resolveImageUrl` (relative backend path → backend origin, needed
on IIS where there is no `/uploads` proxy). A missing or broken file shows the provider's initials. The picker reloads the list
each time it opens, so a new image shows on the next open. POS Config "Provider Own Menu Status" (`providerOwnStatus`,
owner's rule 2026-11-13, replaces the earlier "hide providers" rule): providers are ALWAYS on the POS. ON = a provider order
shows only the categories / products in that provider's Provider Settings (server categories + `fixProviderMenuProducts`; a
provider with no settings for the branch shows nothing). OFF = every category and product, at the provider's price where it has
one. Search (`searchProducts`) with OFF merges the normal list with the provider's list, because `/menu/product-list` returns only
the provider's products for a provider id even with providerOwnStatus=false (8060: Zomato 13 of 16). Saving POS Configuration
writes `providerOwnStatus` into this device's `posConfigs` copy (it was left out) and fires `pos_config_updated`
(`pos/utils/posConfigEvents.ts`); `usePosProducts` reloads the menu on it (and on another tab's posConfigs write). Back Office
Delivery Status does NOT hide a provider in the POS. Bulk settlement still lists every provider (old unsettled orders).
Delivery addresses (2026-11-13, `PosDeliveryPage`): UPDATE edits the address on screen (`PUT /order/delivery-address/{addressId}`,
`useDelivery.updateAddress`) and stays on the page; it is disabled when no saved address is loaded (new data). New addresses for
a customer only through MORE ADDRESS (`PosMoreAddressModal`, POST). Save Delivery on a changed saved address edits it (it used to
POST a new copy every time); only a number with no address gets its first one created. Test: `deliveryAddressUpdate.test.tsx`.
Leaving unsaved: Back to POS asks "Leave without saving?" (Yes, leave / No, stay) when the form differs from how the screen
opened or from the last UPDATE (`baselineFormRef`, checked on click); Save Delivery leaves without asking. Re-opening with a chosen
address no longer looks the number up again (that replaced it with the FIRST saved address); the lookup skips its first run.
Counter on prints (2026-11-13, `pos/utils/printCounterName.ts`): KOT, guest, settle, recall, settled and dine-in prints used
the fixed text "Main". Now a saved order prints its own counter (server `counterName`), else this device's counter from system
registration (localStorage `systemCounterName`); empty when unknown. Test: `printCounterName.test.ts` (snapshots print "Counter1").
Provider customer (2026-11-13): picking a provider sets its post account as the customer WITH its name
(`usePosProviderTender` → `setSelectedCustomer`; name from `GET /provider/account-list`, `pos/utils/providerAccountName.ts`,
loaded once). The settle receipt takes the on-screen customer (`buildSettleReceiptPayload({ customerName })`) after the saved
order's names and before "WALK IN" — a direct settle has no saved order, so it used to print WALK IN (cash sale now prints
CASH CUSTOMER; `terminalSettleSnapshot` updated). Test: `providerCustomerName.test.tsx`.
Provider order type name (2026-11-13): a provider order keeps the PROVIDER NAME as its order-type name ("Zomato": set in
OrderModals on pick; the backend returns it as `orderType` on recall / print data). `providerNameFromOrderType`
(`pos/utils/providerOrderType.ts`) spots it; `fallbackOrderTypeByName` maps any non-standard name to Providers (5) — it used to
fall to DineIn (recall window "Type: DineIn", recall KOT, recalled order loaded for Edit). The recall / settled window shows
"Providers (Zomato)"; the KOT prints the provider name; the guest / invoice header prints "(ZOMATO)" (settle receipt gets it
from `activeProvider` via `buildSettleReceiptPayload({ providerName })`). Charges are unaffected (only /dine/ adds service charge).
Provider order id (fixed 2026-11-13, front end): the POS used to save EVERY provider order as orderTypeId 5, which the server reads
as Swiggy (orders 60, 61 were Zomato, customer = Zomato's account 5, and show "Swiggy" for good). Now OrderModals sets the
provider's id as the order type and `orderPayloadMapper` sends `session.providerId` as orderTypeId; `selectMenuOrderTypeId` uses
any id > 4; a recalled order restores the provider from orderTypeId (`savedOrderToCart`). Recall / Void / Settled "Providers" tab:
fetches all (no OrderTypeId) and keeps provider rows (`isProviderOrderRow`); the Coming tab is gone. The order APIs have no
`providerId` field (Swagger) — orderTypeId IS the provider. On 2026-11-13 backend 8060 returned `imageUrl: null` for Swiggy and Zomato.
Backend endpoint with the duplicate / wrong code + alt name rows: `GET /api/v1/provider-settings/{transId}/provider-settings-data`.
Back Office Provider Settings form (`general/providerSettings`, checked 2026-11-12): payloads match the backend DTOs
(POST: branchId, providerId, createdAt, details[productId, unitId, isIncl, price]; PUT adds transId, updatedAt instead of
createdAt). Fixes: Edit loads each product's REAL alternatives (list_alt_name) and shows its own code (load_products) instead
of the server's wrong ones; a product row without a unit warns instead of being dropped; a second price list for the same
provider + branch is refused; Excl / Incl use the product's own sales VAT (`utils/providerVat.ts`: productid-data sVatId +
product load_master-data VAT list), not a fixed 5 %. Test: `providerSettingsForm.test.tsx`.
Price box (2026-11-13, `utils/priceInput.ts`): shown with the company's currency decimals (`useCurrency` decimalPart: 150 →
"150.000") on load / product pick / alt pick and when not being edited; typing accepts only digits + one dot with at most that many
decimals (`acceptPriceInput`, otherwise the old value stays); blur / Enter tidies it ("1.5" → "1.500"). Enter moves to the next
row's price (its product box if that row is empty); the last row adds a row (Enter used to do nothing on other rows). Tests:
`providerSettingsPriceInput.test.tsx`, `providerSettingsForm.test.tsx`.
Find product (2026-11-13, `utils/gridSearch.ts`): a find box above the grid highlights every row whose product name, alt name
or code contains the text (case-insensitive), scrolls the current match into view and shows "n of N"; Enter / ▼ next,
Shift+Enter / ▲ previous (wraps), Esc / × clears; the same product on several rows is found on each. Test:
`providerSettingsGridSearch.test.tsx`.
Enter key (2026-11-14): Provider → Date → Branch → Category → Load Data (Sub Category → Load Data; Category goes to Sub Category
only if its list is already loaded); editing: Date skips the locked Branch. Grid: product pick → Alt Name → Enter → Price → next row.
Rows are keyed by index (a key holding productId / unitId rebuilt the row on pick and focus was lost). `handleFocusNextInput`
(`utils/keyboard.ts`) also stops on buttons marked `data-focus-next` (opt-in; only Load Data uses it). Test: `providerSettingsEnterKey.test.tsx`.

**Extras & Modifiers** (More → EXTRAS & MODIFIERS, route `/pos/menu-masters`, `pos/menuMasters/`): tabs for Extras, Extras Type,
Modifier and Modifier Type. Each tab renders the Back Office page (`inventory/extrasMaster`, `extrasType`, `modifier`, `modifierType`),
so change forms and rules there. The More tile asks for an employee PIN; any valid PIN passes until the backend team adds the privilege, then set
`permissionId` in `PosMoreModal`. No user role checks in the POS: the page wraps the tabs in
`SkipPermissionsContext` (`hooks/usePermissions.ts`), and the same pages in the Back Office still follow user roles. Inside the POS, `PosAllocationScopeContext` gives the Extras and Modifier forms
categories from POS master data (`/category/category-list` can return 403 for a POS login, and `getCategories` turns that into an empty list),
hides Branch Allocation and sets the branch to `getTerminalBranchId()`; an edit keeps the record's other branches (`posBranchIds`), so a name or price change applies to every branch that has the record (user decision 2026-11-06). Leaving the screen calls
`menuApi.refreshAllExtras()`: never clear that cache, `orderLineItems` uses it to recognise extras on saved orders. Lines already in the
cart keep the price and name they were added with.

---

## 7. Rules for changing pricing code

1. **All math goes through `src/features/pos/pricing/`.** Do not add new VAT/discount/charge formulas in
   components, hooks, mappers or templates. Need a new number? Add it to the engine result.
2. The engine stays **pure**: no localStorage, Redux, React or guessing. Config is read in `billing.ts`
   and passed in as `PricingSettings`.
3. Never invent a VAT rate or inclusivity. Use the product master tag, the saved line rates, or the configured default.
4. Saved orders: fetch Exclusive, derive rates from the order, never from current settings (except combine/fallback).
5. Keep 14 dp internally (exact decimal, half-up — never truncate); round only for display / print / payment.
6. Screen, payload and print must agree. If you change one path, check the other two.
7. **Every pricing bug fix gets a golden test** using a real backend sample (see
   `src/tests/pricingGoldenOrders.test.ts`, `order288RoundedVat.test.ts`, `order297DineIn.test.ts`,
   `order301StaleMaster.test.ts`).
8. Run `npx vitest run` and `npx tsc -b` before declaring done.
8a. **Every change gets tests (owner's rule, 2026-11-13).** Any new feature, update or bug fix that touches logic (pricing,
   payloads, mappers, filters, state, API handling) ships with tests in the same change; a bug fix includes a test that fails on
   the old code. Backend behaviour is pinned with mocked responses as seen on the server (e.g. `providerOrders.test.ts`).
   Visual-only changes (colour, spacing, layout) need a real-app check instead; snapshot only when the markup itself matters
   (receipts, KOT). When tests are skipped for a change, say why.
9. Never paste API responses that contain a bearer token into code, tests or chat.

---

## 8. Known legacy / tech debt (do not extend)

- A saved order with a bill discount only on the order total: `pricing/storedOrder.ts` `withBillDiscountOnLines` spreads it
  over the lines from the saved totals. Older orders whose line amount leaves out extras, or whose discount is stored in the
  other view, can't be told apart without guessing: their rows and Sub Total can be wrong, Grand Total stays right.
- Saving sends engine values as they are: order, update, invoice and split lines are never re-derived from tax
  settings. `orderApi.submitOrder/updateOrder` only fill `vatExclAmount`/`vatAmount` when missing.
- `orderPayloadMapper` "useStoredTotals": an unmodified recalled order without a bill discount keeps the
  selector's (authoritative) `netAmount`/`vatAmount`. Transitional.
- `invoicePayloadMapper` recomputes `vatExclAmount` from details (+ modifiers when not already combined)
  and VAT as the sum of line VAT.
- ~~`useSplitOrderData` remainder rule~~: the hook was unused and was deleted on 2026-11-05.
- `terminal/utils/pos-calc.ts` now holds only `allocate`. `utils/orderLineItems.ts` reads a line's extras, modifiers and messages without calculating.
- `getBillingConfig` falls back to a 10% VAT rate when the config has none — confirm the menu
  `/products` API sends `vatValue` per product.
- Not yet verified in the real app: print templates, split/combine and bulk settle after the engine refactor.

---

## 9. Tests map (`src/tests/`)

| Area | Files |
|---|---|
| Engine | `pricingEngine`, `pricingConsistency`, `rounding`, `billing`, `discount`, `manualPrice`, `happyHour`, `extrasPerLine`, `extrasModifierQty`, `duplicateExtras`, `vatInclusiveProduct`, `inclusive/exclusiveSpreadsheetCalculation` |
| Saved orders | `storedOrder`, `recallAndSettleDisplay`, `recallEditRoundTrip`, `recallEditSameAsScreen`, `vatAndSavedRates`, `menuOrderData` |
| Golden orders | `pricingGoldenOrders`, `order288RoundedVat`, `order297DineIn`, `order301StaleMaster`, `userScreenshotScenarios` |
| Payloads / API | `orderPayloadMapper`, `orderApi`, `delivery` |
| Split / combine | `split`, `combine`, `splitAndCombineDiscount`, `combinedProductExtrasPricing` |
| Prints | `printPricing`, `printTaxMatrix`, `printTemplates`, `settledPrint`, `cartPrint`, `printBarcode`, `printScenarios` (every KOT and settle print against POS config, real hooks and store, fake server and printer), `dineInSettlePrint` (same, rendered dine-in screen, jsdom) |
| **Cross-verification** | `posCrossVerification` — 200 seeded random carts (incl/excl, VAT 0/5/10/15, extras, item or bill discount % / amount, discount calc Incl/Excl, Dine-In / Take-Out / Delivery, VAT on/off, SC, levy): engine vs an independent reference model, engine identities, screen = payload = invoice, saved → recall footer, saved → edit, saved → print, saved → split (2 bills = saved total). A failure prints the seed. |
| Regressions | `posRegressions` (bulk settlement allocation, amount bill discount on settled edit), `productionHardening` |
| **Safety net (golden master)** | `posFlowSafetyNet` + `__snapshots__/posFlowSafetyNet.test.ts.snap` — 7 store-driven flows (Take-Out with extras/modifier/message + item discounts, Dine-In SC+levy + amount bill discount, Delivery + custom charge + % bill discount, complimentary, manual price / qty / remove in Exclusive view, VAT off, saved → settled edit → update payload). Snapshots the screen totals + lines, new-order / direct-settle / invoice payloads, update payload and bill + KOT text. Run `npm run test:pos-safety` before and after every refactor step. **Update snapshots (`npx vitest run -u src/tests/posFlowSafetyNet.test.ts`) only for an intended, reviewed change** — show the diff in the PR. |
| Back office | `backofficeCalc` (currency decimals, no invented country/currency IDs, happy hour %/discount/promo incl. 500 random cases, vouchers: half-up, header = Σ lines, balance ≥ 0, multi-pay by name, production / stock exact amounts, purchase bill-discount cap + 300 random invoices), `purchaseCalc`, `unitParent`, `productTransactionLog`, `openingStockCost`, `lineUnits`, `tableLayout`, `cartLineDisplay` |
| Page safety nets (2026-11-13) | `posTerminalActions`, `cashierSessionSnapshot`, `documentFormPagesSnapshot`, `documentKeys`, `voucherPagesSnapshot`, `moreListPagesSnapshot` — pages rendered with a saved record (HTML and field values) recorded before each split and compared after. A full test run rewrites `.snap` files with LF line endings; restore them with git before committing, then re-run any test whose tracked `.snap` gained new entries |
| Legacy | `pos-calc` |

---

## 10. Back Office

The Back Office is the admin side of the same React app: masters, purchases, stock, vouchers, configuration
and reports. It lives under `/dashboard` inside `MainLayout` (sidebar + topbar). Coding rules for it
(React Query, react-hook-form + zod, one hook per form, reuse `src/components/common`) are in `GEMINI.md`
§"Next-Generation Architecture Rule"; the reference modules are `src/features/transaction/production` and
`src/features/transaction/internalStockTransfer`.

### 10.1 One app, two system types
| | POS terminal | Back Office |
|---|---|---|
| `localStorage.systemType` | `pos` | `backoffice` |
| Login | `/cashier/in` (`/auth/pos-login`) | `/` (`/auth/login`) |
| Tokens | `localStorage.accessToken`, `refreshToken`, `userId` … | `sessionStorage.backoffice_accessToken`, `backoffice_refreshToken`, `backoffice_userId` … (per browser tab) |
| Screens | `/pos/*` — needs an open day / shift (`ShiftGuard`) | `/dashboard/*` — needs an active subscription (`BackofficeSubscriptionWrapper`) |

- `utils/authUtils.ts`: `isBackofficeMode()` picks the token store; `clearAuthStorage()` clears both.
- `SystemRegistrationGuard` sends a back-office device away from `/pos` and `/cashier` to `/dashboard`.
- First start: `/company/onboarding` (new company) → `/system/register` (POS or Back Office, branch, terminal) → login.

### 10.2 HTTP client (`src/api/axiosInstance.ts`)
- Base URL from `/public/config.json` at runtime (`src/config.ts`), else `VITE_API_BASE_URL`, else `/api/v1`.
- Every request: `Authorization: Bearer <token>` (from the right store) and tenant header `clientDb`
  (= `localStorage.tenantId`); a few endpoints resolve the tenant from the token only and get no `clientDb`.
- Back-office GET lists / reports get `branchId` (active branch) added automatically.
- A 401 triggers one refresh-token rotation; requests made meanwhile wait in a queue and are retried.

### 10.3 Permissions (`hooks/usePermissions.ts`, `app/routes/RoleGuard.tsx`)
- Every route is wrapped in `RoleGuard moduleName="…" action="View | Add | Edit"`.
- Allowed when `VITE_BYPASS_PERMISSIONS=true`, or the user `isMaster`, or `auth.userRoles` has an active
  `{ module, action }` entry for the module or an alias ("Purchase Return" ↔ "Purchase Return Invoice",
  "Purchase Invoice" ↔ "Purchase", "Sales Invoice" ↔ "Sales").
- Not allowed → redirect to `/dashboard` (on `/dashboard` itself a "no permission" message is shown).
- Module names must match the backend user-role module names exactly.

### 10.4 Module map
All routes are under `/dashboard/…` (`app/routes/AppRoutes.tsx`). Sidebar groups live in
`components/layout/sidebar/` (`NavMasterGroup`, `NavTransactionGroup`, `NavReportGroup`, `NavSettingsGroup`).

**Masters and settings**
| Screen (route) | Folder | Main endpoints |
|---|---|---|
| Dashboard (`/dashboard`) | `features/dashboard` | `/reports/{branch}/admin-dashboard`, `/reports/{branch}/user-dashboard` |
| Company (`company`) | `features/company` | `/company`, `/company/masterload`, `/company/subscription-status` |
| Customers (`customers`) | `features/company/customer` | `/customer`, `/customer/list` |
| Users, user roles (`users`, `user-roles`) | `general/user`, `general/userRole` | `/user`, `/user-role` |
| Employees, employee roles | `general/employee`, `general/employeeRole` | `/employee`, `/EmployeeRole` |
| Branches (`branches`, `/add`, `/edit/:id`) | `inventory/branches` | `/Branch`, print design `/Branch/branches/{id}/print-design-data` |
| Paymodes, counters, sections, tables | `general/paymode`, `counter`, `section`, `tableMaster` | `/paymode`, `/counter`, `/section` … |
| Table Master floor layout | `general/tableMaster/utils/tableLayout.ts` | `position` = 1-based slot, gaps are real empty spots; drop on empty = move, drop on table = swap, only changed tables are saved (`PUT /dinein-tables/{id}`, no bulk endpoint). POS `buildGrid` shows a plain list on duplicate positions, so never save duplicates. Grid columns must match the POS floor plan. |
| Menu settings (sessions / times) | `general/menuSettings` | `/menu-time-settings` |
| Providers (delivery apps), provider settings | `general/provider`, `general/providerSettings` | `/provider`, `/provider-settings` |
| Suppliers | `general/supplier` | `/supplier` |
| Products (`products`, `/add`, `/edit/:id`) | `inventory/product` | `/product`, `/product/{id}/productid-data` |
| Groups, categories, sub-categories, units | `inventory/group`, `category`, `subcategory`, `unit` | `/group`, `/unit` … |
| Modifiers, modifier types, extras, extras types | `inventory/modifier`, `modifierType`, `extrasMaster`, `extrasType` | |
| Taxes (VAT) | `inventory/tax` | `/vat` |
| Voucher series | `inventory/voucherSeries` | `/voucherseries` |
| Lock product | `pos/lockItem` (`services/lockProductService.ts`) | `/lock-product` |
| Stock adjustment types | `inventory/stockAdjustmentType` | `/stock-adjustment-type` |
| Recipes, BOM | `general/recipe`, `general/bom` | `/recipe`, `/bom`, `/recipe/product-cost-data/{id}` |
| Configuration, back-office configuration | `general/configuration` | `/backoffice-config/…` (POS config itself: `/pos-config`, edited at `/pos/configuration`) |
| Happy hour (promo prices) | `general/happyHour` | `/happy_hour`, `/happy_hour/load_products` |
| Denominations | `general/denomination` | `/denomination` |

**Transactions** (`features/transaction/<module>/`: list page, form page, one form hook, service, types)
| Screen | Endpoints |
|---|---|
| Purchase invoice | `/purchase-invoice` (save / update), `/purchase-invoice/data/{id}`, `/details`, `/cancel/{id}`. `roundOff` is saved and loaded; `netAmount` includes it. Other Chg is added to `netAmount` but has no field of its own, so it reads 0 when an invoice is reopened. |
| Purchase return | `/purchase-return-invoice`; loads the source invoice via `/purchase-invoice/data/{id}`. `roundOff` is saved and loaded; `netAmount` includes it. |
| Production | `/production`; unit cost from `/purchase-invoice/{product}/unit-cost/{unit}` |
| Physical entry (stock count) | `/physical-entry`, `/product/as-on-date-stock/{…}` |
| Stock adjustment | `/stock-adjustment`; line unit can be changed, cost from `/stock-adjustment/{product}/unit-cost/{unit}`, baseQty = qty x unit value (helpers: `transaction/shared/lineUnits.ts`) |
| Internal stock transfer | `/stock-transfer`; line unit can be changed, cost from `/stock-transfer/{product}/unit-cost/{unit}`, baseQty = qty x unit value |
| Payment / receipt voucher | `/payment`, `/receipt` |
| Payment / receipt against voucher (settle supplier / customer bills) | `/payment-against`, `/receipt-against` |

Shared: `transaction/shared/components` — `BackofficeMultiPayModal`, `MultiInvoiceSelectionModal`,
purchase / voucher print templates and `pdfGenerator`.

**Reports** (`features/reports/<name>/`: `pages`, `hooks`, `services`, `components/*PrintPreviewModal`,
`utils/exportUtils` for PDF / Excel; data from `/reports/<name>-report`). 31 reports:
- Sales: sales, daily, hourly, monthly, order-type, menu-session, group-wise, category-wise, employee sales,
  all-transaction, bill-wise and product-wise levy, bill-wise and product-wise margin, product output VAT,
  day-end, shift-end, customer statement, customer balance.
- Purchase: purchase, product-wise purchase, purchase return, product input VAT, supplier statement, supplier balance.
- Stock: stock register, stock adjustment (+ product-wise), stock transfer (+ product-wise), product transaction log.

### 10.5 How the Back Office feeds the POS
The POS reads these masters; a wrong value here becomes a wrong price at the till.
| Back-office setting | Used by the POS as |
|---|---|
| Product `price` + `isIncl` (price includes tax) | R1 — the line price and its inclusivity |
| Product / alternative VAT (`vatId` → Tax master `/vat`) | the line VAT rate (`vatValue`); missing → 10 % default |
| Alternatives (`AlternativePricingGrid`) | variants with their own price, `isIncl`, VAT |
| Happy hour (product, price, `isIncl`, time window) | `promoPrice` / `promoIsIncl` — replaces the line price during the window |
| POS configuration (`/pos-config`): VAT on/off, service charge %, levy %, Price View, Print Price, Discount Calc, delivery zones, decimals | §3 of this file |
| Modifier types / modifiers, extras | the modifier popup; label "TYPE NAME" (§6.8) |
| Sections / tables, paymodes, employees, providers, menu sessions | Dine-In, tenders, waiter / authorisation, provider orders, menu |
| Branch print design | headers / footers on every print |

### 10.6 Back-office calculations (separate from the POS pricing engine)
Purchase invoice and purchase return each have their own `calculateLine` in the form hook
(`transaction/purchaseInvoice/hooks/usePurchaseInvoice.ts`, `transaction/purchaseReturn/hooks/usePurchaseReturn.ts`):
```
amount        = qty × price                          (price is exclusive; FOC qty is free stock, not priced)
lineDiscount  = amount / grossTotal × billDiscount   (bill discount shared in proportion to amount)
vatAmount     = (amount − lineDiscount) × vat%
netAmount     = amount − lineDiscount + vatAmount
grandTotal    = Σ netAmount + otherCharge + roundOff
billDiscount  = typed amount, or grossTotal × discount% when a % is entered
baseQty       = (qty + foc) × unit conversion
```
Payments: one paymode, or multi-pay (`paymodeId` 3 + `paymodes[]`, amounts grouped by paymode).

Known gaps (not fixed — check before relying on these numbers):
- Rounding differs: purchase **invoice** sends line amounts rounded to the currency decimals but the header
  `vatAmount` / `vatExclAmount` / `netAmount` unrounded; purchase **return** rounds every line and total.
  Header and Σ lines can differ by a fil. **FIXED:** both now use `transaction/shared/purchaseCalc.ts`
  (`calculatePurchaseLine`, `sumPurchaseLines`): exact decimal, 14 dp, header = exact Σ lines.
- Each line has a `discPercent` field that is sent as `discPer` and printed, but it is not editable (only reset
  to 0) and not used in `calculateLine` — only the bill discount is applied.
- No automated tests cover back-office screens or calculations (`src/tests/` is mostly POS; `unitParent.test.ts`
  is the first back-office test).

Units (`inventory/unit`, and Quick Add Unit in the product form): the parent dropdown comes from
`/unit/unit-listname`, normalised by `normalizeUnitNameList` (accepts `unitId` / `id` / `UnitId` …); `parentId`
is sent through `toParentId` (never NaN). After every save the unit is read back (`verifySavedParent`) and a
warning is shown if the server stored a different parent than the one sent — that would be a backend issue.
- Purchase invoice / return now use the same 14-dp exact maths as the POS; payment amounts stay in fils.

### 10.7 Rules for back-office work
1. Follow `GEMINI.md` (architecture standard, common components, POS-style keyboard UX). Do not edit
   `src/components/` without permission.
2. New screens: `features/<area>/<module>/` with `pages`, `hooks` (form, API and maths), `services`, `types`,
   `components`; React Query for data, react-hook-form + zod for forms; register the route with a `RoleGuard`.
3. Any change to product price / `isIncl` / VAT, happy hour or POS config fields changes POS prices — check §4
   and §10.5 and run `npx vitest run`.
4. Keep back-office money maths in a pure function in the module (like `calculateLine`) so it can be unit-tested;
   add a test with a real saved document when fixing a calculation bug.
5. **Branch ids (backend):** `1` = **All** (every branch), `2+` = real branches (`2` = Main). Helpers in
   `hooks/useBranchScope.ts`: `ALL_BRANCH_ID`, `isAllBranch`, `toReportBranchId` (empty / 0 → 1, never send 0). Report branch lists use `branchApi.fetchBranchNames(true)` (`/Branch/true/list-name`), the same API as the top navbar, whose list includes All (id 1).
   Opening stock (product master) always belongs to a real branch, never All.
   Selecting a unit in its grid sets Cost = product Cost x unit value / main unit value (`calcOpeningStockCost`,
   still editable; with no product Cost, the row's own cost is converted from its previous unit).
6. **Reports must show request errors.** A 403 (POS login, or a role without the report permission) used to show
   as "No records found". Product Transaction Log now shows the reason; do the same in other reports. Test:
   `productTransactionLog.test.ts`. Report default dates use the LOCAL day (`localDateString`), not
   `toISOString()` (UTC = yesterday early morning in GCC / India).

---

## 11. Project overview (whole repo)

### 11.1 What it is
One React SPA (`bitezo-admin`) that serves two products from the same build:
- **POS terminal** (cashier / waiter screens, KOT + bill printing). Runs in a browser (own Printer Agent, `PrinterAgent.exe`, for printers) or as
  an Android app (Capacitor, ESC/POS plugin + custom `BitezoPrinterPlugin.java`).
- **Back Office** (`/dashboard`): masters, inventory, transactions, ~30 reports, company onboarding, system registration.

Backend: separate ASP.NET API (not in this repo), multi-tenant (`clientDb` header = tenant), JWT + refresh token.
Main market: Bahrain / GCC (3-decimal currencies, see R8).

### 11.2 Source layout (`src/`)
| Folder | Contents |
|---|---|
| `main.tsx`, `config.ts` | loads `/config.json` (runtime API URL) before render, falls back to `VITE_API_BASE_URL`, then `/api/v1` |
| `api/axiosInstance.ts` | the only HTTP client: Bearer token, `clientDb`, branchId injection, refresh-token queue (see §10.2) |
| `app/` | `store.ts` (Redux), `routes/` (`AppRoutes` ~120 routes, `ProtectedRoute`, `RoleGuard`, `ShiftGuard`, registration guards), providers |
| `features/auth` | login (POS + back office), auth slice |
| `features/company`, `systemRegistration` | tenant onboarding, company profile, terminal/system registration |
| `features/dashboard` | back-office home |
| `features/general` | bom, configuration, counter, denomination, employee(+role), happyHour, menuSettings, paymode, provider(+settings), recipe, section, supplier, tableMaster, user, userRole |
| `features/inventory` | branches, category, subcategory, group, extras(+type), modifier(+type), product, tax, unit, stockAdjustmentType, voucherSeries |
| `features/transaction` | purchase invoice/return, stock adjustment, physical entry, production, internal stock transfer, vouchers (`shared/purchaseCalc.ts`) |
| `features/reports` | ~31 report modules (sales, VAT, levy, margin, stock, statements, day-end, shift-end …) |
| `features/pos` | see §2 |
| `components/` | shared UI (do not edit without permission), `layout/` (sidebar, topbar) |
| `hooks/`, `utils/` | `usePermissions`, `useBranchScope`, `authUtils`, `money.ts` (decimal.js) … |
| `tests/` | Vitest, mostly POS pricing (see §9) |
| `shared/` (Phase 0) | used by POS and Back Office, may not import features (ESLint): `api/http.ts` (axios client; old path `api/axiosInstance.ts` re-exports), `api/unwrap.ts` (`unwrapBody` / `unwrapData` / `unwrapEnvelope` / `unwrapStrict`), `lib/` money, date, html, print, currency (old `utils/*` paths re-export), `config/settings.ts` (typed safe reads of localStorage settings — use in new code) |

Size: ~84k lines of TS/TSX. Files over 1,000 lines (hard to change safely):
`endReportTemplate.ts`, `usePurchaseReturn.ts`,
`posSlice.ts`. (`PosTerminalPage`, `PosCashierSessionModal` split 2026-11-13.)

### 11.3 Commands
```
npm run verify         # tsc -b + all tests + lint ratchet + build (run before every push)
npm run test:pos-safety  # POS golden master + cross-verification + regressions
npm run lint:ratchet   # fails if any lint rule has MORE errors than lint-baseline.json
npm run lint:baseline  # lock in a lint improvement (refuses to raise the baseline)
npm run dev            # Vite dev server; /api, /uploads, /images proxied to the LAN backend (vite.config.ts)
npm run build          # tsc -b && vite build  → dist/
npm test               # vitest run
npm run lint           # eslint (currently fails, see §12)
npx cap sync android   # copy dist/ into the Android project
```
`npm install` needs `--legacy-peer-deps` (Capacitor peer conflict).

### 11.4 Environments and configuration
| File | Used for | Notes |
|---|---|---|
| `public/config.json` | **runtime** API URL in every build (read first) | edit on the server after deploy, no rebuild needed |
| `.env` | build-time fallback + `VITE_BYPASS_PERMISSIONS` | ignored by git |
| `.env.android` | Android build fallback | untracked + ignored since 2026-11-05 (keep a copy outside git) |
| `.env.development` | dev (empty base → Vite proxy) | ignored |
| `public/web.config` | IIS SPA rewrite (all non-file, non-/api URLs → `/`) | deploy target is IIS |

Auth storage: POS tokens in `localStorage` (`accessToken`, `refreshToken`, `userId`, `isMaster`, `userRoles` …);
back-office tokens in `sessionStorage` (`backoffice_*`). `systemType` / `tempSystemType` decide the mode
(`isBackofficeMode`). POS settings are cached in `localStorage.posConfigs` (§3). The cart is NOT persisted
(`posSlice.loadCart` always starts empty — verified in the browser 2026-11-05): a page reload loses an order that was not placed yet.

PWA: `vite-plugin-pwa` with `registerType: 'prompt'` (update banner in `src/app/AppStatusBanner.tsx`), precaches js/css/html/png/svg (not `config.json`).
Android: `com.bitezo.admin`, `androidScheme: http`, cleartext allowed, `allowBackup=false`, versionCode 1, minify off.
HTTP: `axiosInstance` timeout 60 s (`API_TIMEOUT_MS`). Dates: always `src/utils/date.ts` (never `toISOString().split("T")[0]`). Print HTML: always `escapeHtml` (`src/utils/html.ts`) for text values; print fragments with `printHtmlInIframe` (`src/shared/lib/print.ts`). POS employee names (waiter / cashier on prints, the `posEmpNameMap` cache): only through `src/features/pos/utils/employeeNames.ts` (`resolveEmployeeNameForPrint` for saved-order prints, `findEmployeeName` for KOT / bill, `savedOrderWaiterName` for recall reprints, `mergeEmployeeNames` / `replaceEmployeeNames` to fill the cache).

---

## 12. Production-readiness audit (2026-11-05)

> **STATUS (2026-11-05): FRONTEND PRODUCTION READY**, signed off by the project owner. All frontend audit items are
> fixed (§12.0); tsc clean, 50 files / 486 tests pass, build OK. Release-day steps (not code): put the production API
> URL in `public/config.json` / `.env.android` (HTTPS recommended), commit and merge `refactor/pricing-engine` to
> `main`, run a smoke test on a real terminal + printer (Printer Agent and Android). Backend items (idempotency, role
> checks, decimal precision) are out of frontend scope.

Checked on branch `refactor/pricing-engine` (3 commits ahead of `main`, not merged):
- `npx tsc -b` → **clean**. `npx vitest run` → **49 files / 477 tests pass**. `vite build` → **succeeds**.
- `npm run lint` → **fails: 3,904 errors, 118 warnings** (3,640 `no-explicit-any`, 104 `exhaustive-deps`,
  77 `no-empty` catch blocks, 46 unused vars). Not a release blocker by itself, but `no-empty` and
  `exhaustive-deps` hide real bugs (swallowed errors, stale values in callbacks).

Severity: **P0** = fix before go-live · **P1** = fix soon after / verify with backend · **P2** = clean-up.
Mark items done here (with date) as they are fixed.

### 12.0 Fix status (2026-11-05, frontend only — backend items are out of scope for now)
| Item | Status | What was done |
|---|---|---|
| P0-2 secrets / junk in git | **DONE (untracked)** | `git rm --cached` for logcats, zips, `dist.rar`, `.env.android`, `scratch/`, `test.js`, `old_*`, `fix_*`, `dev-dist/` …; files stay on disk; `.gitignore` fixed + extended. Old commits still contain them (history not rewritten). |
| P0-3 vulnerable deps | **DONE** | `npm audit fix --legacy-peer-deps`: axios 1.21, react-router 7.18.5, @capacitor/android 8.6, dompurify 3.4.17, form-data 4.0.6, follow-redirects 1.16.2. `npm audit --omit=dev` → only `xlsx` (no fix exists; export-only use). Dev-only advisories remain (eslint/workbox/sharp), not shipped. |
| P0-4 HTTP timeout | **DONE** | `axiosInstance` `timeout: API_TIMEOUT_MS` (60 s). No-response errors get a clear message. |
| P0-5 duplicate orders | **PARTIAL (frontend part)** | On a timeout / network error for POST/PUT `/menu/order` or `/sales-invoice*`, the message says "the order may already be saved — check Recall / Settled orders before trying again". A real idempotency key needs the backend. |
| P0-6 UTC date | **DONE** | New `src/utils/date.ts` (`toLocalDateString`, `firstOfMonthLocalString`, `localDateAtCurrentTimeIso`). All 119 `X.toISOString().split("T")[0]` uses replaced (POS voucherDate, purchase / voucher / stock forms, every report default). Report "from" defaults also used to be the **last day of the previous month** in UTC+ zones; fixed. Cashier-session timestamps glued the local date to the UTC time (a day off after midnight); now `localDateAtCurrentTimeIso`. |
| P1-2 HTML escaping | **DONE for POS prints** | `src/utils/html.ts` `escapeHtml`; guest bill, KOT and delivery-settle templates escape product / extra / modifier / note names, Arabic names, customer, address, contact, driver and paymode names. Back-office report prints still interpolate raw values (lower risk: back-office staff data). No CSP added (Printer Agent websocket (ws://localhost:9191), Google Fonts and API host would need whitelisting; test first). |
| P1-3 token mode mixing | **DONE** | `axiosInstance` / `getStoredAccessToken` / `getStoredRefreshToken` no longer fall back to the other mode's token (legacy `localStorage.backoffice_*` keys still read in back-office mode). `clearAuthStorage` intentionally still keeps `tenantId` / `systemType` / printer keys (device registration). |
| P1-4 PWA auto-reload | **DONE** | `registerType: 'prompt'`, `injectRegister: false`, dev SW off. `src/app/AppStatusBanner.tsx` registers the SW and shows "A new version is available — Reload now / Later". |
| P1-5 Android | **PARTIAL** | `allowBackup="false"`. Cleartext kept (API is still http). Version / keystore / minify are release-time tasks. |
| P1-7 report print reload | **DONE** | `src/utils/print.ts` `printHtmlInIframe` (hidden iframe with copied stylesheets). The 12 report modals no longer replace `document.body` or reload the app. |
| P1-9 offline | **DONE (banner)** | `AppStatusBanner` shows a red "No network connection" banner on `offline`. No offline order queue. |
| P2 console.log | **DONE** | `build.rollupOptions.treeshake.manualPureFunctions: ['console.log','console.debug']` (Vite 8 / Rolldown). Bundle `console.log` 89 → 6 (remaining are inside libraries). |
| P2 title | **DONE** | `index.html` title `Bitezo POS`. |
| Esc clears cart | **DONE** | `usePosShortcuts` Esc used to wipe the cart instantly, with no confirmation, even while another popup was open. It now only opens the existing "Clear Order Data?" confirmation (`PosTerminalPage`); Space no longer hijacks a focused button. |
| Fake password reset | **DONE** | Forgot Password → OTP → Reset was a mock (any email/OTP accepted, "Password reset successful" with no API call). Now `ForgotPasswordPage` explains that an administrator resets passwords (Back Office → Users → Change Password); `/verify-otp` and `/reset-password` redirect there; mock screens deleted. Replace with a real flow when a reset API exists. |
| Silent load failures | **DONE** | `app/providers/queryErrors.ts` + `QueryCache.onError` in `AppProviders`: any query that fails with nothing on screen shows an error toast (403 = "No permission …"); 401 / cancellations ignored; identical messages within 4 s shown once; background refetches stay silent. Opt out with `meta: { silentError: true }` (Product Transaction Log shows its own inline error; subscription check). |
| Placeholders | **DONE** | Delivery page "Logs" button (only `alert("Logs Clicked")`) removed; settle print failure no longer shows a blocking `alert()` (toast only, sale is saved). Popup-blocked `alert()`s in report prints kept (legitimate). Remaining empty `catch {}` in POS core are name/setting lookups with fallbacks (reviewed, harmless). |
| POS cross-check bugs | **DONE** | Found by `posCrossVerification`: (1) **Amount bill discount lost on Recall → Settle and Settled → Edit** (`PosRecallDetailsModal.handleSettleOrder`, `loadSettledOrderIntoCart`): bill value was "master − Σ line discounts" = 0 → customer charged the undiscounted price. Now the saved value goes to `resolveRecalledBillDiscount` → `restoreBillDiscount` (exact total; an amount discount may come back as the equivalent %, because the backend does not reliably return master `discPer` — real order #285). (2) **Split of a Delivery order charged the delivery fee on every split bill** (`calculateOrder` default delivery charge; screen + saved netAmount). Now `bucketDeliveryCharge`: base bill keeps the saved charge, new bills 0; `deliveryCharge` is sent per bucket. (3) **Split with a fixed item discount bigger than the product (covering extras)**: the part without extras got too much discount, capped away → split bills summed to more than the order. Now `productDiscountCapacity` caps the moved share. (4) **Complimentary bill (total 0) could not be settled with Cash** (`PosCashTenderModal` required due > 0). (5) **Bulk settlement**: `toFixed` (not half-up) and due = raw Σ totals → phantom fil; now `bulkSettlement/utils/allocatePayments.ts` (half-up fils, due = Σ rounded totals). Verified engine math against an independent model: no differences. Agreed rule confirmed: detail `price` = (product + extras) exclusive ÷ qty. |
| Safety net + print fix | **DONE** | `posFlowSafetyNet` golden master added before the optimization (see §9). It found: saved MESSAGE rows (sent with typeId 1) printed twice on reprints ("* NOTE" and "MSG: NOTE") — `orderPricing.ts` now treats status Message rows only as messages. Note: message rows are saved by id only (`modifierId` = message id, no text); a free-typed message without an id is saved as 0 — confirm the backend resolves / stores message text. |
| Back-office audit | **DONE** | (1) **Company form invented IDs**: `useCompanyForm` / `CompanyForm` fell back to hardcoded country / currency lists (BHD = 1, "Qatari Riyal" = 2 …) when master data did not load → wrong currency/country could be saved. Now lists come only from the API; save is blocked with a visible error when they are missing; dial codes by country NAME (`company/utils/regionalData.ts`). (2) **Decimals fallback 2 with BHD** (login, cashier sign-in, onboarding, authSlice): now `resolveDecimalPart` (backend value, else from currency: BHD/KWD/OMR = 3). (3) **Happy hour** could save a negative promo price / >100 % and promo + discount could be 1 fil off the price: `happyHour/utils/happyHourCalc.ts` (clamped, half-up, promo = price − discount exactly) + validation on add. (4) **Vouchers**: header = float Σ rounded once (1 fil off Σ lines) and fallback balance = received amount for a fully paid invoice; now `transaction/shared/voucherCalc.ts` (`voucherTotal`, `invoiceBalance`, `comparePaid` in multi-pay). (5) **Multi paymode hardcoded as id 3** (payment/receipt vouchers, purchase invoice/return): if Multi had another id, multi-pay lines were NOT saved; now `multiPaymodeId(paymodeList)` (by name, 3 only as fallback) and purchase uses `multiPayId` consistently. (6) **Purchase bill discount** larger than the bill made VAT negative: clamped in `calculatePurchaseLine`. (7) **Float noise** in production / stock adjustment / physical entry / internal transfer amounts: `productionCalc.ts`, `shared/stockCalc.ts` (exact). (8) Report headers no longer print "Bitezo" when the company name is missing. **Open (needs backend answer):** production master `cost` is sent as the GRAND TOTAL (same as `amount`) while detail `cost` is per unit — confirm which the backend expects for finished-goods valuation. Unchanged on purpose: report branch default 1 (= All, by design), `BackofficeMultiPayModal` Cash=1/Card=2 fallback only when the paymode list is empty. |
| Unused files | **DONE (deleted)** | Root: 12 logcat files (~800 MB), android zips, `dist.rar`, `dev-dist/`, `scratch/`, `scratch.js`, `test.js`, `checkBranch.js`, `get_swagger.cjs`, `get_bom_details.cjs`, all `fix_*` / `fix-*` / `old_*` / `temp_*` files, `oldGrid.tsx`, `move_and_fix_modals.cjs`, `lint_output.txt`, `vite-dev*.log`, `test203.png`. `public/`: `config.js` (never loaded) and 11 unreferenced images (`-1.png`, `LOGO1/2/3/5/7`, `POS_LOGIN.jpeg`, `bitezo-logo-hq.png`, `product-icon.png`, `product-placeholder.png`, `icons.svg`, `favicon-16.png`; ~1.6 MB less precached by the PWA). `src/`: 28 files not imported anywhere (incl. `components/layout/Navbar.tsx`, `useSplitOrderData.ts`, `PosModalsContainer.tsx`, `PosSubCategoryRail/Tabs.tsx`, `PayInOutModal.tsx`, `pdfGenerator.ts`, `lib/authenticatedFetch.ts`, duplicate `inventory/lockProduct/services/lockProductService.ts`, unused `constants.ts` files). Kept: docs (`AGENT.md`, `GEMINI.md`, `README.md`, `.agents/`, printer architecture report), feature `index.ts` barrels, `dist/`. tsc clean, 486 tests pass, build OK after the cleanup. |
| Not done | — | P0-1 HTTPS URL (needs the real production host), P0-7 real-terminal test, P0-8 merge to main, P1-1 / P0-5 backend checks, P1-8 empty catches / `alert()`, big-file splitting. |

Tests: `src/tests/productionHardening.test.ts` (local dates, `escapeHtml`, guest bill + KOT print a `<img onerror>` product/customer name as text). After the fixes: `tsc -b` clean, **50 files / 486 tests pass**, `vite build` OK.

**Verify in the real app:** report Print buttons (iframe print), the update banner after a deploy, login / logout in POS and back office (token fallback removed), receipts with `&` in names, cashier-in / cashier-out dates after midnight.

### 12.1 P0 — before go-live
1. **Production API is plain HTTP on a private LAN IP.** `public/config.json`, `.env` and `.env.android` point to
   `http://192.168.x.x:8060/api/v1`. Tokens, passwords and sales data travel unencrypted, and the app only works
   inside that LAN. Put the real production host over **HTTPS** in `config.json` (and `.env.android`) for each
   deployment. If the web app is served over HTTPS, an http API is also blocked as mixed content.
2. **Secrets and junk committed to git (`.git` = 437 MB).** Tracked: bearer JWTs in `test.js`,
   `scratch/fetch_extras.cjs`, `scratch/test-configs.cjs`, `scratch/test-configs.js` (expired May/Jun 2026, but
   they carry tenant/branch/user ids); 12 `logcat*.txt` files (~800 MB of device logs); `android_project.zip`,
   `android_project_v3.zip`, `dist.rar`; `.env.android`; `old_*`, `fix_*`, `temp_*`, `scratch.js`,
   `lint_output.txt`, `test203.png`, `dev-dist/`. Remove them from the repo (`git rm --cached`, add to
   `.gitignore`), keep tokens out of code, and never hand the repo or these files to the client. If the repo was
   ever shared, rotate the backend JWT signing key. `.gitignore` also has a broken line
   (`.env".env" ".env.development"`); `.env` is only ignored because of a later line.
3. **Vulnerable dependencies (`npm audit --omit=dev`).** Critical: `@capacitor/android` (<8.4.3), `dompurify`
   (pulled in by jspdf/html2pdf). High: `axios` ≤1.19 (prototype-pollution header/credential gadgets),
   `react-router` 7.x, `form-data`. Moderate: `follow-redirects`. `npm audit fix` covers all of them; re-run
   tests and build afterwards. `xlsx@0.18.5` (SheetJS on npm) is unmaintained with known CVEs; low risk while it is
   only used for export. Do not use it to parse uploaded files.
4. **No HTTP timeout.** `axiosInstance` has no `timeout`. On a bad network a place-order / settle request can
   hang forever, and the `isSettlingRef` / `isSubmittingOrderRef` locks ignore every later attempt until it ends.
   Set a timeout (e.g. 30 s) and show a clear "check the network" message.
5. **Possible duplicate orders / invoices.** Place order and settle are protected against double-clicks, but
   there is no idempotency key. If the server saves the order and the response is lost (timeout, Wi-Fi drop),
   the cashier retries and a second order / sales invoice is created. Ask the backend for an idempotency key
   (client GUID per order/settle), or check for an existing invoice before retrying.
6. **Wrong business date around midnight (UTC vs local).** `orderApi.ts` (~line 34, ~350), `salesInvoiceApi.ts`
   (~127, ~251) and `invoicePayloadMapper.ts` (~20) fall back to `new Date().toISOString().split("T")[0]` for
   `voucherDate`. That is the **UTC** date: in Bahrain (UTC+3) a bill made between 00:00 and 03:00 gets
   yesterday's date (India: before 05:30). 121 places use this pattern (mostly date-filter defaults); POS payloads
   and day/shift reports matter most. Use a local-date helper (like `localDateString`). Also confirm the backend
   reads `createdAt` / `transDate` (sent as UTC ISO strings) as UTC.
7. **Real-app checks not done yet** (from §8): print templates, split, combine and bulk settle after the pricing
   refactor; 14-dp / fils behaviour against the real backend (DB column precision unknown). Run one full shift on a
   real terminal and printer: open shift → dine-in / takeaway / delivery orders → edit → split → combine →
   discount → void → multi-pay settle → day-end and shift-end reports, and compare the totals with the reports.
8. **Merge the branch.** The production code is on `refactor/pricing-engine`; `main` is at `d359ea8`. Build the
   release from a tagged commit on `main`, not from a working copy (`dev-dist/sw.js` is currently modified).

### 12.2 P1 — security and reliability (verify with backend)
1. **Permissions are client-side only.** `isMaster` and `userRoles` are read from `localStorage` /
   `sessionStorage`; anyone can set `isMaster=true` in DevTools and see every screen. This is fine only if the
   **backend checks the role on every endpoint**. Confirm that. Keep `VITE_BYPASS_PERMISSIONS=false` in every
   production `.env` (it is a global "allow all").
2. **Tokens in localStorage + HTML built from strings.** The POS JWT and refresh token are in `localStorage`, so
   any XSS can steal them. Print code builds HTML with template strings and `document.write` / `innerHTML`
   (reports, KOT, recall print, vouchers) without HTML escaping, and product, customer and address names come from
   the DB. Escape values in print templates and add a Content-Security-Policy in `web.config`.
3. **Token fallback mixes modes.** `axiosInstance` and `getStoredAccessToken` fall back from the back-office token
   to the POS token (and the reverse) when one is missing, so a request can go out under the other user's identity
   on a shared PC. `clearAuthStorage` does not clear `tenantId`, `systemType`, `posConfigs` or printer keys, so the
   next login on the same device can start with the previous tenant's settings.
4. **PWA auto-update during a shift.** `registerType: 'autoUpdate'` reloads open tabs when a new build is
   deployed. A reload loses the cart (not persisted) and any open popup — hence the update banner instead of auto-reload. Deploy outside
   service hours or switch to `prompt` mode. `devOptions.enabled: true` registers a service worker in dev and is
   why `dev-dist/` keeps changing.
5. **Android release settings.** `usesCleartextTraffic="true"`, `androidScheme: 'http'`, `allowBackup="true"`
   (WebView storage with tokens goes into device backups), `minifyEnabled false`, `versionCode 1`. For release:
   HTTPS API, cleartext off (or a network-security-config limited to printer IPs), `allowBackup=false`, bump the
   version on every release, sign with a release keystore kept out of the repo.
6. **Printer Agent (corrected 2026-11-05: QZ Tray is not used).** Desktop printing goes to the own agent
   `PrinterAgent.exe` over plain WebSocket: `printServerIp` → `ws://localhost:9191/print` → `:8181` → page host
   (`qzService.ts` `PrintAgentClient`, JSON `{action, requestId, …}`, 20 s reply timeout); Android uses
   `BitezoPrinterPlugin` raw ESC/POS to `<printer IP>:9100`. Points for the agent side (not this repo): it has no
   auth, so any web page open on that PC can connect to `ws://localhost:9191` and send jobs. The agent should
   accept only the Bitezo origin (check the WebSocket `Origin` header). If the web app is served over **HTTPS**,
   `ws://localhost` still works in Chrome/Edge, but `ws://<ip>` (`printServerIp` / page host) is blocked as mixed
   content. Use the local agent, or give the agent TLS (`wss://`).
7. **Report print reloads the app.** 12 report preview modals replace `document.body.innerHTML`, print, then call
   `window.location.reload()`. It works, but reloads the whole app. Use the new-window / iframe approach that the
   other reports use.
8. **Silent failures.** 77 empty `catch {}` blocks and 23 `alert()` calls (blocking, poor on Android). Reports that
   swallow errors show "No records found" for a 403 (§10.7 rule 6); check every report.
9. **Offline.** No offline mode and no `navigator.onLine` check. When the network drops, orders cannot be placed;
   the cashier should see a clear banner instead of failing requests.

### 12.3 P2 — clean-up / maintainability
- **DONE 2026-11-05:** dead files deleted (see §12.0 "Unused files").
- **DONE 2026-11-10:** interface fonts ship in `public/fonts/ui` (`shared/styles/fonts.css`, names stay `Outfit` and `Inter`), and `.woff2` is in the service worker precache, so interface and receipt fonts work offline. Add no external font link.
- Do not pin `recharts` in `manualChunks` (`vite.config.ts`): its shared helpers come with it and every page then loads the charts. It loads with the dashboard.
- Bundle sizes: `xlsx` (865 kB), `html2pdf` (738 kB), `jspdf` (400 kB), charts (407 kB). They are separate chunks;
  make sure they are only imported lazily from export/print actions.
- 422 `console.*` calls (78 `console.log`), some may log payloads. Drop `console.log` in production builds
  (`esbuild.drop` / `pure`).
- 1,036 direct `localStorage` reads/writes; settings are read from several keys with fallbacks (§3). Prefer one
  typed settings module.
- Legacy pricing code listed in §8 (`pos-calc.ts`).
- The back office has almost no automated tests (§10.6). The giant components (§11.2) need splitting before more
  features are added.
- `ProtectedRoute` calls `clearAuthStorage()` during render (side effect in render).
- `build.target: ['es2015','chrome74']`: confirm the oldest Android WebView you support is Chrome 74+.

### 12.4 Go-live checklist
- [ ] `config.json` / `.env.android` → production **HTTPS** URL; `VITE_BYPASS_PERMISSIONS=false`
- [x] `npm audit fix` → `npx vitest run` → `npx tsc -b` → `npm run build` all green
- [x] Secrets, logs and zips removed from git (untracked; history not rewritten); backend JWT key rotated if the repo was shared
- [x] axios timeout + network-error message · [ ] idempotency agreed with the backend
- [x] Local-date fix for `voucherDate` and day/shift reports
- [ ] Backend confirms role checks on every endpoint and decimal column precision
- [ ] Full shift tested on a real terminal + printer (web + Printer Agent, and Android); totals match the day-end report
- [ ] Release built from a tagged commit on `main`; Android versionCode bumped, release keystore, cleartext off

### 11.5 Phase 0 foundations (2026-11-05)
- **Aliases** (tsconfig.app.json + vite.config.ts + vitest.config.ts, keep in sync): `@shared/*` → `src/shared/*`,
  `@pos/*` → `src/features/pos/*`, `@features/*` → `src/features/*`, `@app/*` → `src/app/*`. New code uses them.
- **Moved with re-export shims** (old imports keep working, new code imports `@shared/...`): `api/axiosInstance.ts` → `shared/api/http.ts`,
  `utils/{money,date,html,print,currency}.ts` → `shared/lib/`. Currency decimals (`currencyDecimals`, `resolveDecimalPart`) live in `shared/lib/currency.ts`.
- **Unwrap**: 7 duplicated `unwrap` helpers replaced by the matching `shared/api/unwrap.ts` variant (same behaviour); `settledOrdersApi` keeps its own (different shape).
- **ESLint boundaries**: `src/shared/**` may not import features/app (exception: `shared/api/http.ts` still imports the auth refresh calls — remove in Phase 2);
  `pos/pricing/**` may not use React/Redux/axios/store/services or `localStorage`/`window`. A POS ↔ Back Office import boundary needs the folder move (relative paths cannot be matched reliably) — Phase 6.
- **Lint ratchet**: `lint-baseline.json` (3,948 errors at start, 3,692 `no-explicit-any`). New errors fail `npm run lint:ratchet` / CI.
- **CI**: `.github/workflows/ci.yml` — install (`--legacy-peer-deps`), `tsc -b`, `test:pos-safety`, all tests, lint ratchet, build — on push to main / refactor/** / feature/** / fix/** and on PRs.

### 11.6 Phase 2a — one saved-order loader (2026-11-05)
`terminal/utils/savedOrderToCart.ts` replaces four copies of "saved order → cart" (~1,000 duplicated lines):
Settled → Edit (`loadSettledOrderIntoCart`, now a thin wrapper), Recall → Edit and Recall → Settle (`PosRecallDetailsModal`,
1,761 → 1,155 lines) and Dine-In table → Edit (`DineInTableOrdersModal`).
- One bill-discount rule for every path (Recall → Edit used a looser one; results match in practice because
  `checkOrderHasBillDiscount` flags the same cases). Kept per mode on purpose: sale id / settled flag (settled: rich lookup with
  order-id fallback; recall: voucher number only), order-type default (settled DineIn, recall TakeOut + hints), recall-settle extra
  delivery fields + `isSettling`, settled-edit table + customer dispatches.
- Dine-In table edit now uses the stored-order footer and `resolveRecalledBillDiscount` (it rebuilt the footer from the legacy
  pricing and passed the bill discount raw); table, waiter, Dine-In and delivery charge 0 are applied as overrides.
- Known limitation (unchanged): if the backend stores the SUM of item discounts on the master, they come back as an equal bill
  discount (same total) — saved data cannot tell them apart (`savedOrderToCart.test.ts`).
- Not migrated: `PosCombineModal` (merges several orders into one — different flow; it already uses `applyStoredPricingToCartItems`).
- Tests: `savedOrderToCart.test.ts` (8) + `posCrossVerification` test 5 now runs all three modes on 200 random carts.

### 11.7 Phase 2b — settings / device context (2026-11-05)
- `shared/config/device.ts`: `getTerminalBranchId()` (systemBranchId → activeBranchId → branchId → 0), `getSystemBranchId()`,
  `getUserBranchId()`, `getSystemCounterId()`, `getTerminalId()` — each reproduces one existing inline chain exactly; call sites keep
  their own final fallback (`|| 0`, `|| 1` = All). Replaced 13 three-step chains + 9 single reads in POS. Use these in new code.
- Order / print paths read Price View / Print Price through `getPriceView()` / `getPrintPrice()` (billing.ts) instead of raw
  `localStorage.getItem("priceView" | "printPrice")` (15 sites: checkout, cart actions, recall, dine-in, recall print). Same value when the
  key is set (terminal init writes it); the getter also handles lower-case values and falls back to posConfigs.
- `shared/api/http.ts` no longer imports the auth feature: `setTokenRefresher()` is registered in `app/providers/AppProviders.tsx`
  (ESLint boundary exception removed). Refresh calls no longer fall back to the tenant `"bitezo_db"` when tenantId is missing.
- POS direct `localStorage.getItem` reads: 463 → 400. Left on purpose: printer targets (Phase 3 printing module), print-template
  resolvers, settings-screen form defaults, session ids and local caches.

### 11.8 Phase 2c — settle lock state machine (2026-11-05)
- `terminal/utils/settleFlow.ts`: `idle → saving → printing → idle` (or `saving → idle` on failure). `usePosCheckoutFlow` uses it instead of
  the `isSettlingRef` boolean; it also drives Redux `isSettling` (disables Settle / Place buttons).
- **Bug closed:** the lock used to be released right after the invoice was saved while the receipt print (up to 20 s) and the cart clear
  still ran → a second Settle tap could save a SECOND invoice for the same order. Now `saved()` is called the moment the invoice save
  succeeds and only `finalizeSettlement` (after print + cart clear, in `finally`) releases the lock; failures before the save release it.
- Employee resolution for settlement (authorised → waiter → default employee → ask authorisation) is one helper
  `settleWithResolvedEmployee` (was duplicated in the cash/multi-pay and card/credit handlers).
- Tests: `settleFlow.test.ts`. Real-terminal check: tap Settle again while the receipt prints → ignored; a print failure still clears the cart.

### 10.8 Back Office keyboard: Enter → next field (2026-11-05)
`hooks/useEnterToNextField.ts`, mounted once for every `/dashboard` screen by `app/routes/BackofficeEnterNavigation.tsx` (POS not affected).
Enter moves to the next visible, enabled, editable field in screen order inside the same form / dialog / page; after the last field it moves
to the submit (Save) button, where Enter saves. It steps aside when the field already handled Enter (calls `preventDefault` — dropdown
option pick, grids, forms using `useEnterKeyNavigation`), in multi-line text boxes, on buttons / links, while a dropdown is open
(`aria-expanded="true"`), with Shift/Ctrl/Alt, or inside an element with `data-enter="native"`. Mark extra Enter targets with
`data-enter-target`; limit the scope with `data-enter-scope`. New screens get this for free — no `nextFieldId` wiring needed.

### 11.9 Phase 2d — popup layers / Esc (2026-11-05)
- `shared/lib/layers.ts` (stack) + `shared/hooks/useModalLayer.ts`. The shared `components/common/Modal.tsx` registers a layer while open
  (owner approved editing it), so all 123 Modal users and `ConfirmDialog` take part. **Esc closes the TOP popup** only — and only if it
  shows the X button (`showClose`); mandatory popups (`showClose={false}`) ignore Esc. If a field inside handled Esc (preventDefault),
  the popup stays open.
- `usePosShortcuts` (Esc = clear-cart confirmation, F2, Space) does nothing while any popup is open.
- Custom POS popups registered: `PosDeliveryChargeModal` (Esc closes), `PosExtrasModifierModal` (its ↑ / ↓ / Esc only act when it is the
  top popup). Not registered on purpose: the small-screen cart overlay in `PosCartPanel` (its flag can stay true on desktop).
  Report print previews are custom overlays — they move to the report framework in Phase 4.
- Tests: `layers.test.ts`.

### 11.10 Phase 4 — report framework (done 2026-11-07: all 31 reports, old pages deleted)
`src/features/reports/framework/` — a report is a definition (`ReportDefinition`: id, title, filters, `fetch` → `{ columns, rows }`,
subtitle). The framework gives every report the same page (`ReportPage`): filter panel (branch / date / month / select, LOCAL-date
defaults, branch never sent as 0 via `toReportBranchId`, branch lock respected), table with S.No, exact totals row (`reportMath`, decimal),
visible error banner (403 / network — was "No records found"), live refresh on transactions + window focus, Print (iframe), PDF and XLS
(`reportOutput`: jsPDF / xlsx loaded only on click; all three from the same `toMatrix` as the screen). Column kinds: text, date
(dd/MM/yyyy), money, number, qty.
- Definitions in `src/features/reports/definitions/`; each route points at a `*FrameworkPage.tsx`. The old module folders now hold only
  `services/` and `types.ts` (plus the log normaliser). Rows not seen live yet (no data): Stock Adjustment x2, Stock Transfer x2, Supplier Statement / Balance.
- **Migrated (31 / 31):** Monthly Sales (`monthlySales.ts`); Daily / Hourly / Order-Type / Menu Session Sales (`salesByPeriod.ts` →
  `periodTable`, row Total modes compute / columnOnly / computeIfMissing); Category / Group / Employee Sales (`itemSales.ts`: field
  fallbacks, Category name resolved against the category master, money totals from backend `totalData` via `totalsOverride`).
  Framework additions: `lookup` filter (options loaded from the server, "All" = 0), `totalsOverride` on `ReportTable`.
  Purchase / Purchase Return (`purchase.ts`, one factory for the twins): supplier / paymode / series client fallbacks, Group by
  Supplier / Paymode / Series (exact sums), Cash / Credit summary; the old branch fallback dropped other branches' rows for "All" — now
  only applied for a real branch. Framework additions: `datetime` column (dd/MM/yyyy HH:mm), `summary` on `ReportTable`,
  `lookup.dependsOn` (Series reloads and resets when the branch changes), select filters printed in the report header.
  Fixed on the way: Order-Type / Category / Group defaulted the branch to 0 and Order-Type double-counted a backend "Total"; float totals.
  Last 21 (`stock.ts`, `sales.ts`, `vatLevy.ts`, `accounts.ts`, `closing.ts`, Product Wise Purchase in `purchase.ts`, helpers in `helpers.ts`): Sales, Product Wise Purchase, Stock Register, Stock Adjustment x2, Stock Transfer x2, Output / Input VAT, Bill / Product Levy, Bill / Product Margin, All Transaction, Customer / Supplier Statement and Balance, Day End, Shift End, Product Transaction Log. Framework additions: client `search`, `rowLink`, `requires` (load waits for a filter), `urlParams`, subtotal rows (`__subtotal`, no S.No), text `summary`, `emptyMessage`, `BLANK_CELL`, column alignment on screen, fixed `columns` kept as the header during loading or after an error. `assertReportSuccess` turns HTTP 200 + `isSuccess: false` into an error.
- Tests: `reportFramework.test.ts`, `reportBatch1.test.ts`, `reportBatch2.test.ts`, `reportBatch3.test.ts` — maths, defaults, errors and old-vs-new comparisons (cells, totals to the fil).
- Adding a report: write a definition (fetch + table mapping), a comparison test against the old page logic, a 3-line page, switch the route.
### 11.11 Phase 5 — Back Office forms (started 2026-11-07)
Purchase Invoice and Purchase Return stay two hooks: their load, save, invoice selection and balance rules really differ. What they do the same way lives in `transaction/shared/`: `purchaseDocument.ts` (pure: dates, stock value, stored payments, save paymodes) and `usePurchaseFormCommon.ts` (totals, paymodes, bill discount percent, suppliers). Change shared behaviour there, once. Purchase Return's gross total now uses the invoice's exact-decimal sum. `purchasePayloadGolden.test.tsx` snapshots what both forms send: a change there means saved data changes.
- Stock Adjustment and Physical Entry share one list page, list hook and read requests: `shared/components/StockDocumentListPage.tsx`, `shared/useStockDocumentList.ts`, `shared/stockDocumentApi.ts`. The branch list is what the API sends, including its All row (id 1); the page adds no All of its own. They differ on purpose only in unit cost parsing and the saved timestamps, which stay in each API. Branch loading is `shared/useStockBranches.ts`; product search and barcode scan are `shared/stockProductLookup.ts`, and each document supplies how its stock figure is loaded. Unit lists, closing stock and unit change are `shared/useStockLineUnits.ts`.
- Simple masters use `components/common/MasterListPage.tsx` for the list, permissions and delete confirm (Counter, Section, Paymode, User Role, Provider, Voucher Series, Unit, Tax, Group, Stock Adjustment Type, Modifier Type, Extras Type; since 2026-11-13 also Customer, User, Supplier, Employee Role, Extras Master, Modifier, Menu Settings, Happy Hour, Provider Settings; the last two open their own form page, `renderForm` returns null). BOM and Recipe keep their own filter-bar lists. Each keeps its own hook and form. Optional settings: `addLabel`, `centered` (Actions column centred), `loadingText` (loading card instead of the table), `extraActions` (more row buttons, e.g. User Change password).
- Payment and Receipt Vouchers share one hook, API, schema and list page: `shared/useVoucherForm.ts`, `voucherApi.ts`, `voucherTypes.ts`, `components/VoucherListPage.tsx`. Each passes a small config. Since 2026-11-13 both form pages render `shared/voucherForm/VoucherFormPage.tsx` (owner's choices: branch change clears series, number, employee, paymode and account; errors after the first Save; closing MultiPay without paying restores the previous paymode; Amount up to 12 characters; 2-line Narration). `voucherPayloadGolden.test.tsx` snapshots URL and body.
- Payment and Receipt Against Vouchers share `useAgainstVoucherForm.ts`, `useAgainstVoucherList.ts`, `againstVoucherApi.ts`, `againstVoucherSchema.ts`, `againstVoucherTypes.ts`, and since 2026-11-13 one page, `shared/voucherForm/AgainstVoucherPage.tsx` (Supplier / Customer wording and Receipt's tolerant reading of pending invoices kept per kind). `againstVoucherPayloadGolden.test.tsx` snapshots URL and body.
- Exact copies of `unwrap` and `formatDateOnly` now come from `shared/api/unwrap.ts` and `shared/lib/date.ts`: pick the variant that matches a service's error rules, do not add copies.
- Purchase Invoice and Return pages (2026-11-13) render `shared/purchaseForm/`: `PurchaseLineGrid`, `PurchaseFormFooter`, `PurchaseFormDialogs`, `usePurchaseFormPage` (save question and save, print after save, new supplier, paymode bookkeeping). Each page keeps its header. Their differences are a `kind` switch, marked in the code. Purchase Return MultiPay now opens the payment window (it did nothing).
- All six document pages use `shared/documentForm/`: `DocumentFormShell` (title, master-data error, card, close button; Production keeps its own larger card), `ClearFormDialog`, `documentKeys.ts` (Enter moves, row exit, number-cell limits, focus helpers). The four stock grids stay separate on purpose (owner, 2026-11-13): their controls, styles and keys differ.
- `stockDocumentPayloadGolden.test.tsx` snapshots editing the four stock documents; their hooks are not merged yet.
- Done and pending for every phase: `OPTIMIZATION_STATUS.md`.

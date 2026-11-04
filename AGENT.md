# AGENT.md — Bitezo POS + Back Office (frontend)

Guide for any AI agent or developer working on this app. Sections 1–9 cover the POS terminal
(`src/features/pos/`); section 10 covers the Back Office (everything under `/dashboard`).
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
- Capacitor (Android) + ESC/POS and QZ Tray for printing
- Vitest (`src/tests/`, 37 files / 382 tests)

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
    menuApi.ts, posConfigApi.ts, dineInApi.ts, printerSettingsApi.ts, qzService.ts
  terminal/
    store/posSlice.ts      cart, order type, discounts, editing state, void lists
    store/posSelectors.ts  selectCartCalculation → calculateOrder (the cart totals on screen)
    utils/billing.ts       config readers (localStorage) + adapters over the engine
                           (calculateOrder, calculateLineItem, getBillingConfigForOrder)
    mappers/orderPayloadMapper.ts    cart → order payload (new / update / direct settle)
    mappers/invoicePayloadMapper.ts  order payload + payments → sales-invoice payload
    mappers/orderDetailToCartMapper.ts, utils/loadSettledOrderIntoCart.ts  saved order → cart
    hooks/usePosCartActions.ts   place / update order, KOT printing
    hooks/usePosCheckoutFlow.ts  settle (cash / card / credit / multi-pay), settle prints
    hooks/menu/useProductSelection.ts  add product: promo/happy hour, alternatives, isIncl
    hooks/useSplit*.ts, usePosVoidFlow.ts, usePosDiscountFlow.ts, usePosRecall.ts, usePosSettled.ts
    components/            UI only (cart, menu, modals/*)
  utils/
    printPricing.ts        numbers for every print (saved order or live cart)
    orderPricing.ts        LEGACY unified pricing — now used only for names/extras/modifiers
    guestPrintTemplate.ts, kotTemplate.ts, escPosGenerator.ts, deliverySettlePrintTemplate.ts
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

Live configuration at time of writing: VAT on, 3 decimals, Price View / Print Price / Discount Calc
all `Inclusive`.

Order types: `1 DineIn, 2 TakeOut, 3 DriveThru, 4 Delivery, 5 Providers, 6 Coming`
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
- Extra qty is **per line**, not multiplied by line quantity.
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
- Known limits: a JS number holds ~15–16 significant digits, so for amounts ≥ 100 the 14th decimal is limited
  by the number type wherever a value leaves the engine (payloads; the backend DTOs are `double`). Σ of lines
  that were each rounded at 14 dp can differ from the exact bill value by 1e-14 (never visible).
  Orders saved before this change carry 7-dp values; restored values show that noise (e.g. 14.99999996).
- Tests: `precision14.test.ts` (truncation cases), `purchaseCalc.test.ts`, `displayBalance.test.ts`.

**Display balancing (decided in the frontend, 2026-11-04)**
- VAT rule: **per line** (each line its own VAT rate; the bill VAT is the exact Σ of line VAT).
- Every footer that is shown or printed is balanced to the fil with `balanceBillFooter` (largest remainder):
  Sub Total − Discount + Charges = Net Value and Net Value + VAT + Delivery = Grand Total always add up.
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
- Extras AND modifiers are added once per line (qty 1); tapping one again shows "already added"
  (`PosExtrasModifierModal`, no qty +/−).
- Bill discount: `setBillDiscount` (replaces item discounts, R5).
- Delivery: customer + address required; delivery charge editable (`setCustomDeliveryCharge`). The footer shows
  Delivery Charge AFTER VAT (it is not taxed, R7); one tap opens `PosDeliveryChargeModal`, which lists only the
  configured zones (`posConfigs.deliverycharges`), else the configured default charge — never invented sample zones.
- Dine-In: section + table required; waiter, guest count.
- Totals on screen: `selectCartCalculation` → `calculateOrder` → `priceBill`.

### 6.3 Place order (KOT)
`usePosCartActions.submitOrder` → `buildNewOrderPayload` → `POST /menu/order` (retries on ticket conflict)
→ KOT print per printer routing (category / product / section / order type) → clear cart.
Order / ticket numbers are assigned by the backend: read the save reply with `readCreatedOrder`
(`services/orderResponse.ts`, accepts any reply shape), then the saved order (`getOrderDetails`).
Never print a guessed number; templates use `toDisplayNo` so a missing value prints blank, not "undefined".

### 6.4 Recall & edit
Recall list `GET /order/recall` → details (merged endpoints, Exclusive) → `PosRecallDetailsModal`
shows `storedOrderFooter`.
Dine-In table orders (`DineInTableOrdersModal`): `GET /menu/dine-in/tables/{tableId}/orders` (fetched
Exclusive) gives the table's orders, shown as Recall-style rows (row text = the Recall list's own text for
that orderId, from `GET /order/recall?OrderTypeId=1`). Clicking a row opens `PosRecallDetailsModal`; its
Edit / Settle are routed back to the table screen's Dine-In flows via `onEditRequest` / `onSettleRequest`. Edit → `loadRecalledOrder` (see §5.8).
Save → `buildUpdateOrderPayload` → `PUT /menu/order/{id}` with `prevUpdatedAt` concurrency token
(fetched fresh before the update). Combined groups update the highest order id.
Existing lines keep their `mapId`; new lines get `max(mapId)+1…`. Removed/decreased lines go to
`voidProducts` / `voidModifiers`.

### 6.5 Settle
`usePosCheckoutFlow`:
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
- **Split / Combine are blocked** for orders with a bill discount or complimentary status
  (`checkOrderAllowsSplitOrCombine`). Only item discounts are allowed.
- Split (`PosSplitModal`, `useSplitBuckets`, `useSplitOrderData`): lines are moved between buckets;
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
- Master KOT (`executeKotRouting`, `isMaster: true`): same KOT template (items, modifiers, delivery block) with
  no totals / VAT; printed once per order or re-order on the master printer (and/or bill printer); never for
  void prints (by design).
- RE-ORDER (edited order sent again): `terminal/utils/reorderItems.ts` — only added quantities; modifiers and
  extras printed as attached (not multiplied by the share of new units).
- Package (packager) print: guest template with `isPackager: true` (title PACKAGER) after an order is placed,
  when POS config `packagerPrint` is on; whole order; balanced footer; `packagerHeader` setting controls the
  company header (`showCompanyHeader`). Not printed on direct settle (no order placed first).
- Templates: `guestPrintTemplate.ts`, `kotTemplate.ts`, `escPosGenerator.ts` (Android), QZ Tray (desktop).
- Bill discount is printed once in the footer; rows show no per-line discount.
- Delivery orders taken from a missed call (`missedCall`) print "Missed Call : YES" in the DELIVERY DETAILS block
  of the KOT and guest bill; every print-data builder passes `missedCall` (saved order value, else cart state).
- Modifiers show as `<TYPE> <NAME>` ("NO SUGAR", "TEST TEST1") everywhere — cart, recall / settled / dine-in
  previews, KOT, guest bill — via `utils/modifierLabel.ts` (`modifierLabelOf`). Never build the label inline.
  Saved rows with an empty `typeName` use the type remembered per modifier id when the modifier list loaded.

### 6.9 Other modules
Bulk settlement (driver/provider unsettled orders), cashier in/out, pay in/out, lock item, delivery
customers, provider orders (`orderTypeId 5`, customer = provider post account).

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
9. Never paste API responses that contain a bearer token into code, tests or chat.

---

## 8. Known legacy / tech debt (do not extend)

- `utils/orderPricing.ts` (`buildUnifiedOrderPricing`): old heuristic pricing; now only supplies
  names/extras/modifiers to `printPricing` and some modals. Its numbers are replaced.
- `billing.ts` `getTaxExclusivePrice` / `sanitizeTaxExclusiveDetail` / `getTaxExclusiveExtraPrice` /
  `getDisplayPriceForProduct`: tolerance-based guessing (0.03 / 0.05). Engine output is flagged
  `isPriceTaxExclusive: true`, so they pass it through unchanged — keep that flag on every payload detail.
- `orderApi.submitOrder/updateOrder` re-derive `vatExclAmount`/`vatAmount` only when missing; they must
  **not** re-sanitize engine details (that caused order #288's rounded VAT).
- `orderPayloadMapper` "useStoredTotals": an unmodified recalled order without a bill discount keeps the
  selector's (authoritative) `netAmount`/`vatAmount`. Transitional.
- `invoicePayloadMapper` recomputes `vatExclAmount` from details (+ modifiers when not already combined)
  and VAT as the sum of line VAT.
- `useSplitOrderData` allocates a master discount by `price × qty` without the engine's remainder rule.
- `terminal/utils/pos-calc.ts`: different charge cascade; only `allocate` is used.
- `getBillingConfig` falls back to a 10% VAT rate when the config has none — confirm the menu
  `/products` API sends `vatValue` per product.
- Not yet verified in the real app: print templates, split/combine and bulk settle after the engine refactor.

---

## 9. Tests map (`src/tests/`)

| Area | Files |
|---|---|
| Engine | `pricingEngine`, `pricingConsistency`, `rounding`, `billing`, `discount`, `manualPrice`, `happyHour`, `extrasPerLine`, `duplicateExtras`, `vatInclusiveProduct`, `inclusive/exclusiveSpreadsheetCalculation` |
| Saved orders | `storedOrder`, `recallAndSettleDisplay`, `recallEditRoundTrip`, `recallEditSameAsScreen`, `vatAndSavedRates`, `menuOrderData` |
| Golden orders | `pricingGoldenOrders`, `order288RoundedVat`, `order297DineIn`, `order301StaleMaster`, `userScreenshotScenarios` |
| Payloads / API | `orderPayloadMapper`, `orderApi`, `delivery` |
| Split / combine | `split`, `combine`, `splitAndCombineDiscount`, `combinedProductExtrasPricing` |
| Prints | `printPricing`, `printTaxMatrix`, `printTemplates`, `settledPrint`, `cartPrint` |
| Legacy | `orderPricing`, `pos-calc` |

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
| Menu settings (sessions / times) | `general/menuSettings` | `/menu-time-settings` |
| Providers (delivery apps), provider settings | `general/provider`, `general/providerSettings` | `/provider`, `/provider-settings` |
| Suppliers | `general/supplier` | `/supplier` |
| Products (`products`, `/add`, `/edit/:id`) | `inventory/product` | `/product`, `/product/{id}/productid-data` |
| Groups, categories, sub-categories, units | `inventory/group`, `category`, `subcategory`, `unit` | `/group`, `/unit` … |
| Modifiers, modifier types, extras, extras types | `inventory/modifier`, `modifierType`, `extrasMaster`, `extrasType` | |
| Taxes (VAT) | `inventory/tax` | `/vat` |
| Voucher series | `inventory/voucherSeries` | `/voucherseries` |
| Lock product | `inventory/lockProduct` | `/lock-product` |
| Stock adjustment types | `inventory/stockAdjustmentType` | `/stock-adjustment-type` |
| Recipes, BOM | `general/recipe`, `general/bom` | `/recipe`, `/bom`, `/recipe/product-cost-data/{id}` |
| Configuration, back-office configuration | `general/configuration` | `/backoffice-config/…` (POS config itself: `/pos-config`, edited at `/pos/configuration`) |
| Happy hour (promo prices) | `general/happyHour` | `/happy_hour`, `/happy_hour/load_products` |
| Denominations | `general/denomination` | `/denomination` |

**Transactions** (`features/transaction/<module>/`: list page, form page, one form hook, service, types)
| Screen | Endpoints |
|---|---|
| Purchase invoice | `/purchase-invoice` (save / update), `/purchase-invoice/data/{id}`, `/details`, `/cancel/{id}` |
| Purchase return | `/purchase-return-invoice`; loads the source invoice via `/purchase-invoice/data/{id}` |
| Production | `/production`; unit cost from `/purchase-invoice/{product}/unit-cost/{unit}` |
| Physical entry (stock count) | `/physical-entry`, `/product/as-on-date-stock/{…}` |
| Stock adjustment | `/stock-adjustment` |
| Internal stock transfer | `/stock-transfer` |
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

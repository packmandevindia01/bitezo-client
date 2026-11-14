# Optimization status

Last updated 2026-11-14. `refactor/pricing-engine` merged into `main` on 2026-11-11 (merge 8a07d3c). Real-terminal test done by the owner on 2026-11-13: no visible issues (visual check, not a line-by-line comparison).
The plan is in `OPTIMIZATION_PLAN.md`; how the code works is in `AGENT.md` (§11).

Back Office print time AM/PM (2026-11-14): the Print Preview of Purchase Invoice, Purchase Return, Stock Adjustment, Stock Transfer, Receipt / Payment and Receipt / Payment Against vouchers showed only the date (Purchase as 2026-11-07). Now the Date line is dd/MM/yyyy plus the time the document was saved in 12-hour AM/PM (07/11/2026 03:25 PM), and a "Printed on dd/MM/yyyy hh:mm AM/PM" line is added. The saved time is the backend created time of a document opened for edit (`pickSavedAt`: createdAt / createdDate / createdOn), or the moment Save succeeded for the print right after Save. If the backend sends no created time for a saved document the Date line shows the date alone (Printed on still shows). NOT YET CONFIRMED: whether backend 8060/8066 returns createdAt in the /data/{id} responses (could not read them: 403 in the dev browser). Testers: save a Purchase Invoice → the print after Save shows the date + current time with AM/PM and Printed on; reopen it with Edit → Print: if the date shows no time, pass to the backend team that /purchase-invoice/data/{id} (and the other /data/{id}) should return createdAt. Check the same on Purchase Return, Stock Adjustment, Stock Transfer and the four vouchers.

Order preview time AM/PM (2026-11-14): the POS Recall and Settled order previews (and the Dine-In table order cards, which use the Recall ticket) showed the order time in 24-hour form (13:40:00); now 12-hour with AM/PM (01:40:00 PM), shared helper `pos/utils/orderDateTime.ts`. The prints (guest bill, settle receipt reprint, KOT) were already AM/PM and are unchanged. Testers: recall an order taken after 12 noon → Date shows e.g. 01:40:00 PM; same in Settled details and the Dine-In table cards; a morning order shows AM.

Find product in document grids (2026-11-14): Purchase, Purchase Return, Stock Adjustment, Stock Transfer and Physical Entry now have the Provider Settings "Find product in list" box above the lines (name or code; matching rows highlighted, current one scrolled to, "n of N", Enter / Shift+Enter or ▲ / ▼, Esc clears). Provider Settings uses the same shared box now. Testers: open a saved document with many lines on each of the five screens → type part of a product name → its row is highlighted and scrolled to; type a code; a product on two lines → Enter jumps between them; on Purchase, search for a new product in a line first, then use the find box → saved lines are still found.

POS login background (2026-11-14): the faint watermark behind the PIN pad on Cashier In still read "BITEZO"; now "BITEVO" (the side picture was already the Bitevo one). Login page image alt text also says Bitevo. Testers: open the POS Cashier In screen → the large faint word behind the keypad reads BITEVO.

Provider Settings Enter key (2026-11-14): Enter after picking a product lost focus (now goes to Alt Name, then Price); Enter on Alt Name did nothing; Enter after Category / Sub Category skipped Load Data and jumped to the find box; when editing, Enter on Date got stuck on the locked Branch. Testers: new price list with keyboard only: Provider, Date, Branch, Category, Enter → Load Data is focused, Enter loads; in a row pick a product with Enter → Alt Name → Enter → Price → Enter → next row; Edit a saved list → Enter on Date opens Category.

Delivery addresses (2026-11-13): UPDATE now edits the address on screen (no new copy) and is disabled for new data; More Address is the only way to add another address; Save Delivery on a changed address edits it. Testers: load a number, change Flat, UPDATE → More Address list shows ONE address with the new Flat; a new number → UPDATE greyed out.

Delivery leave warning (2026-11-13): Back to POS with unsaved changes asks "Leave without saving?"; re-opening the screen keeps the address chosen through More Address. Testers: change a field → POS → No stays / Yes leaves; no change → leaves at once; pick the 2nd address in More Address, Save, reopen Delivery → still the 2nd address.

Counter on prints (2026-11-13): prints showed "Main" (fixed text); now the counter that made the order, or this device's registered counter. Testers: KOT, guest and settle print on a counter registered as e.g. Counter1 → "Counter : Counter1"; a reprint of another counter's order shows that counter.

Provider Settings find product (2026-11-13): find box above the grid; matching rows highlighted, current one scrolled to, "n of N", Enter / Shift+Enter or ▲ / ▼ between matches, Esc clears. Testers: a long price list → type part of a name → it scrolls to the row; a product on two rows → both highlighted, Enter jumps between them.

Settle receipt customer (2026-11-13): a direct settle printed "WALK IN"; it now prints the order's customer (provider post account, picked customer, or CASH CUSTOMER). Picking a provider now also shows its post account name on screen. Testers: Swiggy order → settle print says CASH CUSTOMER; Zomato → Rahul.

Provider Settings price box (2026-11-13): prices show with the currency decimals (150.000), typing is limited to that many decimals, Enter moves to the next row's price (last row adds a row). Testers: open a saved provider price list → prices with 3 decimals; type 1.2345 → the 4th decimal is refused; Enter walks down the rows.

Provider image (2026-11-13, outside the phases): the backend changed provider create / update to multipart form data with the image inside (JSON failed with "BranchIds field is required"); `providerService` now sends form data. The POS provider picker and the Back Office provider edit preview now resolve the saved image path like product and category images do (`resolveImageUrl`); a broken image falls back to the initials. POS Config "Provider Own Menu Status": providers always show; ON = only the products in that provider's Provider Settings, OFF = every product (provider price where set), search included; the menu reloads as soon as the config is saved. Testers: Zomato order with the switch ON shows only Zomato's Provider Settings products; OFF shows all categories and products. Provider orders no longer show as DineIn in the recall / settled windows, the recall KOT or when a recalled order is opened for Edit; the KOT prints the provider's name and the receipt header "(ZOMATO)". Testers: take a Zomato order → check the KOT, the recall window and the settle receipt. Provider orders are now saved with the provider's own id as the order type (5 Swiggy, 6 Zomato …, as the server's order-type list has them); before, every provider order was saved as 5 = Swiggy, so old orders 60 / 61 stay "Swiggy". "Coming" is no longer treated as an order type (it was saving as 6 = Zomato); it is a Delivery order with isComing. Recall / Void / Settled: the Providers tab lists all provider orders, the Coming tab is removed. Testers: a new Zomato order must show "Zomato" in recall, KOT and receipt; a Swiggy order "Swiggy"; recall → Edit → save keeps the provider; a Come & Collect delivery saves as Delivery. Also: upload an image to a provider in the Back Office, then open Select Provider in the POS. Backend 8060 returned `imageUrl: null` for both providers on 2026-11-13. If it still does after an upload, that's a backend note: `/menu/providers` doesn't return the image.

## Phases

| Phase | Work | Status |
|---|---|---|
| 0 | Foundations | Done |
| 2 | POS core | Done, real-terminal test passed 2026-11-13 |
| 4 | Report framework | Done, 31 of 31 reports; 6 reports not seen with real rows |
| 5 | Back Office forms | **Mostly done** 2026-11-13: purchase and voucher pages merged, document page frame, 21 of 23 lists on the shared list. Left: stock document hooks, Production list / APIs, `unwrap` variants (below) |
| 1 | Design system | Not started, needs approval to move `components/common` |
| 3 | POS UI | **Partly done**: all five big POS windows split (Recall, Settled, Dine-In table orders and the settle hook 2026-11-11; terminal page and cashier session 2026-11-13); `escPosGenerator` removed (unused). Left: 3-zone layout, printing module (P5) |
| 6 | Clean-up | **Partly done** 2026-11-11 (below) |

## Phase 3 (2026-11-11 and 2026-11-13)

### Done

- Recall details (1,112 → 610 lines) and Settled details (1,434 → 411) windows split. Shared ticket view in `components/modals/savedOrder/`; settled loader, settled print, recall KOT and the list-text fallback moved to `terminal/utils/` (`loadSettledOrder.ts`, `printSettledOrder.ts`, `printRecallKot.ts`, `recallListText.ts`), moved verbatim.
- Safety net: `savedOrderWindowsSnapshot` renders both windows (dine-in item discount; delivery bill discount) and matched the old HTML exactly after the split. Unit tests: `savedOrderPieces`.
- Two deliberate changes: the Settled window no longer shows a duplicated modifier row the backend sometimes sends (the Recall window already dropped it); it no longer fetches extras and modifier types twice on open, and a different order now opens in a fresh window (`key` per order in `PosSettledModal`).
- Not checked in the real app: open, PRINT and EDIT from Settled; KOT, GUEST, EDIT and SETTLE from Recall.
- Terminal settle hook `usePosCheckoutFlow`: 1,264 → 486 lines. The 775 lines that build the receipt data after the invoice is saved moved verbatim to `utils/settleReceiptData.ts` (`buildSettleReceiptPayload`, with the saved-line mapping and the driver lookup as their own functions). Safety net `terminalSettleSnapshot` (new cart cash; recalled Dine-In with item discount; delivery with bill discount, address, driver, keep change; combined order; settled bill update) records the invoice and every page printed and matched before and after; `settleReceiptLines` covers the saved-line mapping. No intended change. Not checked in the real app: terminal settle cash / card / multi-pay, recall settle, settled edit.
- Dine-In table orders window: 1,306 → 664 lines. Order loader, invoice building, settle receipt, guest bill, the shared bill figures, the reserved / row-text / payment-type helpers and the row component moved out (`loadDineInOrder.ts`, `dineInSettlement.ts`, `printDineInOrder.ts`, `dineInBillFigures.ts`, `dineInTable.ts`, `TableOrderRow.tsx`). The guest bill and the settle receipt had the same line and totals code twice; now one helper (settle receipt still shows a discount only for a bill discount). The terminal uses the same Cash-first payment order helper. Safety net `dineInTableOrdersSnapshot` (list, invoice, both receipts, cart after Edit) matched before and after; unit tests `dineInHelpers`. No intended change. Not checked in the real app: table list, row PRINT, SETTLE (receipt, drawer) and EDIT.
- Terminal page `PosTerminalPage` (2026-11-13): 1,109 → 614 lines. ORDER key → `hooks/usePosOrderAction.ts`; SETTLE key → `hooks/usePosSettleAction.ts`; price, qty and complimentary keys → `hooks/usePosItemEdits.ts` (Qty-reduction voids in `utils/qtyReductionVoid.ts`); provider order and payment method → `hooks/usePosProviderTender.ts`; phone cart button → `components/layout/PosMobileCartButton.tsx`. Order and Settle pick the employee with one helper, `pos/utils/actionEmployee.ts` (`resolveActionEmployee`: waiter, then default employee, then ask); ORDER had the same "ask for an employee" callback six times, now once. Same checks, messages and order as before; screen markup unchanged. Test: `posTerminalActions` (20 cases, every branch). No intended change. Not checked in the real app: ORDER and SETTLE with a waiter, with the default employee and with an employee code; Qty lowered on a recalled line; a provider order.
- Cashier session window `PosCashierSessionModal` (2026-11-13): 1,169 → 146 lines. State and server steps (open day / shift, close shift / day, pending-order check and settle, Shift End / Day End prints, logout) → `system/cashierSession/useCashierSession.ts`; screens → `SessionHeader`, `ManualAmountPanel`, `DenominationPanel`, `PendingOrdersModal`. The keypad and the submit / close buttons were written twice (one per screen); now `SessionKeypad` and `SessionActionButtons`. The three copies of the error toast, the two report prints and the denomination payload → `cashierSessionActions.ts`. Safety net `cashierSessionSnapshot` (open day by keypad, open shift by denominations, close shift with Shift End print, close shift + day with pending orders settled, close day after a failed pending check, cancel and a server error) records the HTML, every server call, toasts, saved values and prints; matched before and after. No intended change. Not checked in the real app: open day, open shift, close shift, close day with and without pending orders, and both prints.

### Not done

- The employee choice before settling is written out three times in the Dine-In window (left as is; it could now use `resolveActionEmployee`).
- Printing module (P5) and the 3-zone layout. The big POS splits are done (`escPosGenerator` was deleted instead: unused).

## Phase 6 (2026-11-11)

### Done

- Old pricing: `terminal/utils/pos-calc.ts` deleted. Its one helper moved unchanged to `shared/lib/money.ts` as `allocateThousandths` (save safety net in `orderApi` / `salesInvoiceApi`). Not swapped for the engine's `allocateProportionally`, which rounds differently and would change saved amounts.
- `escPosGenerator.ts` deleted (2026-11-13, 985 lines): the report window built plain-text ESC/POS markup for Day End, Shift End and the six summaries and passed it to `printPosReport`, which ignores it (every print, web and Android, uses the HTML). `printEscPosMarkup` was never called. The markup option of `printPosReport` is gone; `printEscPosMarkup` and the Android plugin's `printEscPos` are kept, unused. Prints do not change. Lint 2,905 → 2,812.
- Unused files deleted: `app/store/index.ts`, the old `BranchCreationPage` and `BranchModal`, `inventory/lockProduct/types.ts`, `pos/services/posService.ts` and its index, `useSplitBuckets.ts`, `useCashierShift.ts`, the `utils/print.ts` re-export. Feature `index.ts` files kept as agreed.
- `console.log`: already removed from production builds (`manualPureFunctions` in `vite.config.ts`); confirmed in a build. No real `alert()` is left.
- Empty catches (74): reviewed; almost all are deliberate fallbacks. Fixed two that hid problems: POS Configuration save now warns when this device's copy could not be updated; Stock Transfer barcode Enter now says "not found" or "could not look up".
- Lint: `prefer-const`, redundant `Boolean()` and unused `catch (e)` fixed; `no-unused-vars` accepts `_name` and `{ dropped, ...rest }`. 3,388 → 2,971 errors, baseline locked. Left: 2,840 `no-explicit-any`, 72 `no-empty` (the deliberate fallbacks), React hooks rules. `components/common/TouchKeyboard.tsx` not touched (protected folder).
- Day End and Shift End report tests press View (they broke when reports stopped loading on open).
- Employee names: the `posEmpNameMap` cache and the waiter-name lookups (two full 5-step copies, two 3-step copies, recall and reprint copies, ~5 cache writers) moved into `pos/utils/employeeNames.ts`; about 335 lines less. Same order of lookups and the same fallbacks as before; two small differences: a name found by id lookup on the table-orders print is now also cached (the settled print already did), and POS Configuration no longer writes the list a second time (a failed refresh used to wipe the cache). Test: `employeeNames`.

### Not done

- Move tests next to the code (109 files): no behaviour gain, large diff.
- `any` down to under 500: a typing job, file by file.

## Phase 5

### Done

- Purchase Invoice and Return share totals, paymodes, bill discount percent, suppliers and payment mapping. They stay two hooks because their rules differ.
- Document pages (2026-11-13). Purchase Invoice and Return pages: 899 + 798 → 67 + 106 lines. Their line grid, footer (discounts, paymode, totals, keys), dialogs and save / print flow are one set of components in `transaction/shared/purchaseForm/` (`PurchaseLineGrid`, `PurchaseFormFooter`, `PurchaseFormDialogs`, `usePurchaseFormPage`); each page keeps only its header. Where the two behaved differently it still does, marked in the code (Invoice: toasts and focus on a failed field, length limits on qty and price, row click; Return: paymode required, invoice lookup, unit search across categories). All six document pages share the page frame (`DocumentFormShell`: title, master-data error, card, close button), the Clear Form question and the Enter-key helpers (`shared/documentForm/`); Production keeps its larger card. Safety net `documentFormPagesSnapshot`: the six pages rendered with a saved document, HTML and every field value, recorded before and matched after; the save payloads (`purchasePayloadGolden`, `stockDocumentPayloadGolden`) did not change. **One deliberate change:** on Purchase Return, choosing MultiPay now opens the payment window (it did nothing before; Purchase Invoice already opened it). Not checked in the real app: open, edit, save and print each of the six pages; MultiPay on a return.
- Voucher form pages (2026-11-13). Payment and Receipt Voucher pages (345 + 353 lines) are one page, `shared/voucherForm/VoucherFormPage.tsx`; Payment and Receipt Against Voucher pages (767 + 803) are one page, `shared/voucherForm/AgainstVoucherPage.tsx`; each page file is now a few lines. **Behaviour chosen by the owner for the plain vouchers** (they had drifted apart): changing the branch clears series, voucher no, employee, paymode and account; field errors show once Save is pressed; closing the MultiPay window without paying brings back the previous paymode (Payment had this but it never worked: it always restored an empty paymode); Amount up to 12 characters and a 2-line Narration box. Also taken from Receipt: clearing the account clears its name, clearing the series clears the number, Ref No shows its error. Close button no longer a tab stop on both. Against Vouchers: no change (Supplier / Customer wording and the Receipt-only invoice-field reading kept per kind). Safety net `voucherPagesSnapshot`: the four pages with a saved voucher (HTML and field values) recorded before; both Against pages identical after, Receipt Voucher differs only in two button attributes, Payment Voucher only in the chosen fields; tests for the MultiPay and branch choices fail on the old Payment page. Payloads (`voucherPayloadGolden`, `againstVoucherPayloadGolden`) unchanged. Not checked in the real app: new / edit / delete / print on all four; MultiPay cancel; branch change.
- Payment and Receipt Vouchers share one hook, API, schema and list page.
- Payment and Receipt Against Vouchers share one form hook, list hook, API, schema and types.
- Stock Adjustment, Physical Entry and Stock Transfer share one saved list page and list hook; Stock Adjustment and Physical Entry also share the read requests of their API (`shared/components/StockDocumentListPage.tsx`, `shared/useStockDocumentList.ts`, `shared/stockDocumentApi.ts`). Test: `stockDocumentList`. Not yet opened in the real app.
- Stock Adjustment, Physical Entry and Stock Transfer forms and lists load branches through one hook (`shared/useStockBranches.ts`). New-document payloads and branch defaults are covered by `stockFormBranches`.
- Stock Adjustment and Physical Entry share product search and barcode scan (`shared/stockProductLookup.ts`). Test: `stockProductLookup`.
- All four stock forms load unit lists through one hook; Stock Adjustment and Stock Transfer also share unit change and closing stock (`shared/useStockLineUnits.ts`). Test: `stockLineUnits`.
- Counter, Section, Paymode, User Role, Provider, Voucher Series, Unit, Tax, Group, Stock Adjustment Type, Modifier Type and Extras Type use one list screen (`components/common/MasterListPage.tsx`). Their hooks and forms stay separate because their rules differ. Test: `masterListPages`.
- 38 `unwrap` and 5 `formatDateOnly` exact copies replaced by `shared/api/unwrap.ts` and `shared/lib/date.ts`.
- Payload snapshots: `purchasePayloadGolden`, `voucherPayloadGolden`, `againstVoucherPayloadGolden`, `stockDocumentPayloadGolden`.

### Not done

| Work | Size | Note |
|---|---|---|
| Stock Adjustment, Physical Entry, Transfer hooks | About 2,000 lines left, mostly loading saved documents and building payloads, which differ per document | Stock Transfer has no product search or scan to share. Production shares only 9% |
| Production list page and the Transfer and Production APIs | Production filters by branch, product and unit, has no dates and shows other columns, so it stays separate. The APIs use different paths and method names | Leave unless they change |
| Stock document line grids | The four grids use different controls, cell styles and key behaviour, not only different columns | Owner chose on 2026-11-13 to keep them separate: one shared grid would change how the screens look and act. Their repeated focus and add-line code now uses `documentKeys` helpers (`focusLineQty`, `focusLineProduct`, `focusFieldLater`; the Stock Adjustment add-line step is written once instead of five times). Test `documentKeys` |
| Voucher form pages | Done 2026-11-13 | See "Voucher form pages" under Done |
| More list screens on `MasterListPage` | 21 of 23 done (2026-11-13: Customer, User, Supplier, Employee Role, Extras Master, Modifier, Menu Settings, then Happy Hour and Provider Settings, whose Add / Edit still open their own page; owner approved the standard delete question and buttons for those two). Safety net `moreListPagesSnapshot`. Left on purpose (owner): BOM and Recipe, which use a filter bar instead of a search box | Stock Adjustment Type has no permission checks; confirm whether it should |
| Remaining `unwrap` variants | 11 services with their own rules | Compare one by one |

## Bugs fixed on 2026-11-07

| Screen | Bug |
|---|---|
| Physical Entry | Re-saving a saved document changed `baseQty` (3 boxes of 12 sent 108 or 3 instead of 36). **Check saved entries since this code shipped, because stock may be wrong.** |
| Stock Transfer | Line amounts sent float noise (`3.3000000000000003`) |
| Payment Against Voucher | Opening a split payment dropped its lines, so saving lost them |
| Payment Against Voucher | The form's `transId` held the series id |
| Receipt Voucher | Editing replaced the saved number on screen with the next number |
| Purchase Invoice and Return | Round off was not sent, and opened as 0 |
| Stock Transfer reports | Failed by default: To Branch All sent 0, the API needs 1 |
| All reports | HTTP 200 with `isSuccess: false` showed as "No records found" |
| Reports | A cleared Branch filter sent `BranchId=0` |
| Purchase Return report | Bill Date was blank: the API sends `purchaseReturnDate` |
| Reports and vouchers | Receipt Against and both plain vouchers did not refresh open reports |

## Bugs fixed on 2026-11-10

| Screen | Bug |
|---|---|
| Physical Entry | A slow unit-cost reply could change a line whose unit had moved on, and a failed one was silent |
| Stock Transfer list | Cancelling did not refresh the stock reports |
| Group master | An Inactive group showed as Active in the list |
| POS recall / edit | In Exclusive view an inclusive product showed a wrong rate on the cart rows (order 285: 82.645 instead of the saved 90.909) |
| POS close day | If the pending-orders check failed, the day closed with no warning; it now asks to try again or close anyway |
| POS locked items | If the list failed to load, items could sell as unlocked with no warning; the last saved list stays in force and a warning shows |
| Stock Adjustment and Stock Transfer prints | Number, branch and date were blank, and Stock Adjustment printed the product id instead of its name |
| Stock Adjustment | A product list arriving late wiped the branch, Ref No and anything already typed |
| Stock Adjustment (new) | The form looped and reset itself while the product list was loading |
| Stock Adjustment, Physical Entry, Stock Transfer (new) | A new document could start on the API's All row; it now starts on the first real branch. **Check saved Stock Adjustments with branch 1 (All).** |

## Behaviour changes to check

- Reports: Print goes straight to the browser dialog; the old preview and custom layouts are gone. All Transaction has no grand total.
- Receipt Voucher: the first series is selected on a new voucher.
- Payment Voucher: spaces around Ref No and Narration are removed; a split that does not add up marks Amount.
- Plain vouchers: a split line with no paymode saves as Cash.
- Purchase Return: gross total uses exact decimals.
- 2026-11-13, Purchase Return: choosing MultiPay opens the payment window (it did nothing before).
- 2026-11-13, Payment and Receipt Voucher (owner's choices): branch change clears series, number, employee, paymode and account; errors show after the first Save; closing MultiPay without paying restores the previous paymode; Amount up to 12 characters; 2-line Narration. Close button is no longer a tab stop.
- 2026-11-13, nine list pages (Customer, User, Supplier, Employee Role, Extras Master, Modifier, Menu Settings, Happy Hour, Provider Settings): Edit / Delete buttons have tooltips and the shared disabled style; Happy Hour's delete question is the standard one (Delete / Cancel).

## Not checked in the real app

- 2026-11-13 work (passes automated tests with a mocked network only): terminal ORDER / SETTLE with a waiter, the default employee and an employee code, Qty lowered on a recalled line, a provider order; cashier session open / close day and shift with Shift End / Day End prints; report printing after the `escPosGenerator` removal; the six document pages (open, edit, save, print), MultiPay on a purchase return, adding lines with Enter on the stock pages; the four voucher pages; the nine converted lists.
- Voucher and Against Voucher merges, Physical Entry and Transfer fixes, and the helper replacement. They pass automated tests with a mocked network only.
- Stock Adjustment x2, Stock Transfer x2, Supplier Statement and Supplier Balance reports: no data existed.
- Print, PDF and XLS: output checked on Sales and All Transaction only, with the dialog and downloads blocked.

## Pending from the owner

1. ~~Real-terminal test~~: done 2026-11-13, no visible issues.
2. Production HTTPS host.
3. Decide whether to move `components/common` to `shared/ui`, which Phase 1 needs.
4. GCC fils and 14-decimal precision: what the actual fils problem is, and the database column precision.

## Pending from the backend team

- Purchase Return report: `refNo` and `employee` were reported missing; the report now shows them, so confirm.
- Returns 1 and 2 hold a wrong `roundOff` (1.2 and 35; should be 7 and 20).
- Margin %: rows and totals mix ratios and percentages (100.000 against 1.000). Cost is 0.000 in the margin reports seen.
- Sales report: `refNo` and `employee` are not sent.
- Security and data checks listed in `AGENT.md` (P1-1, P0-5).

## Other items

- Statements total the Balance column as the old pages did. If it is a running balance, that total means nothing.
- Production: the finished product's `baseQty` falls back to qty if its units have not loaded when saving.
- Performance: the charts library no longer loads at app start (start 327 → 229 kB gzip, POS terminal 480 → 382 kB, plan target under 400 kB). `jspdf` loads only on Purchase Export PDF. The menu grid was already virtualised with memoised tiles, so it needed no work.
- Fonts: Outfit and Inter ship in `public/fonts/ui` (`shared/styles/fonts.css`), and interface and receipt fonts are in the offline cache. Nothing is requested from Google.
- Stock Adjustment, Physical Entry and Stock Transfer forms do not offer All as a branch or To Branch; a document already saved under All still shows it. Saved lists and reports keep All.
- Payment and Receipt Against Voucher forms use the compact input size of the other transaction forms.
- POS pricing replacement: done. `utils/orderPricing.ts` and the tax guessing in saving are removed; prints use `utils/printPricing.ts`, line details `utils/orderLineItems.ts` and `utils/orderLineShape.ts`.
- Not started: other performance items (re-render measurements), Playwright smoke tests, CI, report column chooser and saved filters, Ctrl+K search, unsaved-changes guard, new dashboard, empty catches and `alert()`.
- A login token was pasted into chat on 2026-11-07. Ask the backend team to revoke it if possible.

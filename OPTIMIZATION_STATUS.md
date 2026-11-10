# Optimization status

Last updated 2026-11-10, branch `refactor/pricing-engine`, not merged to `main`.
The plan is in `OPTIMIZATION_PLAN.md`; how the code works is in `AGENT.md` (§11).

## Phases

| Phase | Work | Status |
|---|---|---|
| 0 | Foundations | Done |
| 2 | POS core | Done, real-terminal test pending |
| 4 | Report framework | Done, 31 of 31 reports; 6 reports not seen with real rows |
| 5 | Back Office forms | **Partly done** (below) |
| 1 | Design system | Not started, needs approval to move `components/common` |
| 3 | POS UI | Not started |
| 6 | Clean-up | Not started |

## Phase 5

### Done

- Purchase Invoice and Return share totals, paymodes, bill discount percent, suppliers and payment mapping. They stay two hooks because their rules differ.
- Payment and Receipt Vouchers share one hook, API, schema and list page.
- Payment and Receipt Against Vouchers share one form hook, list hook, API, schema and types.
- Stock Adjustment, Physical Entry and Stock Transfer share one saved list page and list hook; Stock Adjustment and Physical Entry also share the read requests of their API (`shared/components/StockDocumentListPage.tsx`, `shared/useStockDocumentList.ts`, `shared/stockDocumentApi.ts`). Test: `stockDocumentList`. Not yet opened in the real app.
- Stock Adjustment, Physical Entry and Stock Transfer forms and lists load branches through one hook (`shared/useStockBranches.ts`). New-document payloads and branch defaults are covered by `stockFormBranches`.
- Stock Adjustment and Physical Entry share product search and barcode scan (`shared/stockProductLookup.ts`). Test: `stockProductLookup`.
- All four stock forms load unit lists through one hook; Stock Adjustment and Stock Transfer also share unit change and closing stock (`shared/useStockLineUnits.ts`). Test: `stockLineUnits`.
- Counter, Section, Paymode and User Role use one list screen (`components/common/MasterListPage.tsx`). Their hooks and forms stay separate because their rules differ. Test: `masterListPages`.
- 38 `unwrap` and 5 `formatDateOnly` exact copies replaced by `shared/api/unwrap.ts` and `shared/lib/date.ts`.
- Payload snapshots: `purchasePayloadGolden`, `voucherPayloadGolden`, `againstVoucherPayloadGolden`, `stockDocumentPayloadGolden`.

### Not done

| Work | Size | Note |
|---|---|---|
| Stock Adjustment, Physical Entry, Transfer hooks | About 2,000 lines left, mostly loading saved documents and building payloads, which differ per document | Stock Transfer has no product search or scan to share. Production shares only 9% |
| Production list page and the Transfer and Production APIs | Production filters by branch, product and unit, has no dates and shows other columns, so it stays separate. The APIs use different paths and method names | Leave unless they change |
| `DocumentForm`: shared form page and line grid | About 3,000+ lines of form pages | Needs a visual check of each screen |
| Voucher form pages | 4 pages | Field behaviour differs; decide which behaviour to keep |
| More list screens on `MasterListPage` | 4 of the 23 list pages done | Next candidates: Provider and Voucher Series, then Tax, Unit and Group. Add tests before each |
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
| Stock Adjustment | A product list arriving late wiped the branch, Ref No and anything already typed |
| Stock Adjustment (new) | The form looped and reset itself while the product list was loading |
| Stock Adjustment, Physical Entry, Stock Transfer (new) | A new document could start on the API's All row; it now starts on the first real branch. **Check saved Stock Adjustments with branch 1 (All).** |

## Behaviour changes to check

- Reports: Print goes straight to the browser dialog; the old preview and custom layouts are gone. All Transaction has no grand total.
- Receipt Voucher: the first series is selected on a new voucher.
- Payment Voucher: spaces around Ref No and Narration are removed; a split that does not add up marks Amount.
- Plain vouchers: a split line with no paymode saves as Cash.
- Purchase Return: gross total uses exact decimals.

## Not checked in the real app

- Voucher and Against Voucher merges, Physical Entry and Transfer fixes, and the helper replacement. They pass automated tests with a mocked network only.
- Stock Adjustment x2, Stock Transfer x2, Supplier Statement and Supplier Balance reports: no data existed.
- Print, PDF and XLS: output checked on Sales and All Transaction only, with the dialog and downloads blocked.

## Pending from the owner

1. Real-terminal test: one shift with a printer, on web and Android. Then merge to `main`.
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
- Not started: other performance items (re-render measurements), Playwright smoke tests, CI, report column chooser and saved filters, Ctrl+K search, unsaved-changes guard, new dashboard, empty catches and `alert()`.
- A login token was pasted into chat on 2026-11-07. Ask the backend team to revoke it if possible.

# Optimization status

Last updated 2026-11-07, branch `refactor/pricing-engine`, not merged to `main`.
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
- 38 `unwrap` and 5 `formatDateOnly` exact copies replaced by `shared/api/unwrap.ts` and `shared/lib/date.ts`.
- Payload snapshots: `purchasePayloadGolden`, `voucherPayloadGolden`, `againstVoucherPayloadGolden`, `stockDocumentPayloadGolden`.

### Not done

| Work | Size | Note |
|---|---|---|
| Stock Adjustment, Physical Entry, Transfer, Production hooks | 2,900 lines | About half the lines overlap at most; snapshots cover editing only, so add new-document cases first |
| Their APIs and list pages | Stock Adjustment and Physical Entry list pages are nearly identical | Quickest next step |
| `DocumentForm`: shared form page and line grid | About 3,000+ lines of form pages | Needs a visual check of each screen |
| Voucher form pages | 4 pages | Field behaviour differs; decide which behaviour to keep |
| `MasterPage` and `createResourceApi` | 38 master pages, about 37,000 lines in `general` and `inventory` | Largest part of Phase 5; no safety net yet |
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
- Not started: performance items, Playwright smoke tests, CI, report column chooser and saved filters, Ctrl+K search, unsaved-changes guard, new dashboard, empty catches and `alert()`, font bundling.
- A login token was pasted into chat on 2026-11-07. Ask the backend team to revoke it if possible.

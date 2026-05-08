// ─── Public surface of the systemRegistration module ────────────────────────

export { default as SystemRegistrationPage } from "./pages/SystemRegistrationPage";
export { default as CashierInPage } from "../pos/cashier/pages/CashierInPage";
export { default as CashierOutPage } from "../pos/cashier/pages/CashierOutPage";
export { useCashierShift } from "./hooks/useCashierShift";
export type * from "./types";

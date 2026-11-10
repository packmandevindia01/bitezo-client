/** Payment and Receipt Against Voucher follow the Purchase Invoice layout: compact fields, all in line, one bottom bar. */
import { describe, it, expect } from "vitest";
import paymentPage from "../features/transaction/paymentAgainstVoucher/pages/PaymentAgainstVoucherPage.tsx?raw";
import receiptPage from "../features/transaction/receiptAgainstVoucher/pages/ReceiptAgainstVoucherPage.tsx?raw";

const tags = (source: string, name: string) => source.split(`<${name}`).slice(1).map((rest) => rest.slice(0, rest.indexOf("/>")));

describe.each([["Payment", paymentPage], ["Receipt", receiptPage]])("%s Against Voucher", (_name, source) => {
  it.each(["FormInput", "SearchableSelect"])("every %s is compact", (name) => {
    const found = tags(source, name);
    expect(found.length).toBeGreaterThan(0);
    found.forEach((tag) => expect(tag).toContain("!h-8"));
  });

  it("Series is the same search box as the other fields, and nothing is nudged out of line", () => {
    expect(source).not.toContain("<SelectInput");
    expect(tags(source, "SearchableSelect").some((tag) => tag.includes('label="Series"'))).toBe(true);
    expect(source).not.toContain("translate-y-");
    expect(source).toContain("items-end pr-8");
  });

  it("the line table and its buttons are compact", () => {
    expect(source).not.toContain('className="h-9');
    expect(source).not.toContain("px-4 py-3");
    expect(source).toContain("border-collapse text-xs");
  });

  it("Paymode, the total and Save, Print, Clear share the bottom bar", () => {
    const bar = source.slice(source.indexOf("border-t border-gray-100 bg-white px-3 py-2"));
    expect(bar.indexOf('label="Paymode"')).toBeGreaterThan(-1);
    expect(bar.indexOf("Total Amount")).toBeGreaterThan(bar.indexOf('label="Paymode"'));
    const save = bar.indexOf('form="');
    expect(save).toBeGreaterThan(bar.indexOf("Total Amount"));
    expect(bar.indexOf("Printer")).toBeGreaterThan(save);
    expect(bar.indexOf("RotateCcw")).toBeGreaterThan(bar.indexOf("Printer"));
    expect(bar).not.toContain('className="w-32"');
  });
});

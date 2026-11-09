// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { generateEndReportHtml } from "../features/pos/utils/endReportTemplate";
import { closingColumnNames, closingTable } from "../features/reports/definitions/closing";

const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const data = {
  cashFlow: { cashSales: 10, openingBal: 5, payIn: 1, payOut: 2, closingBal: 14, purchase: 3 },
  tips: [{ paymodeName: "Cash", amount: 4 }],
  tipsSummary: [{ paymodeName: "Card", amount: 6 }],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("branchPrintData", JSON.stringify([{ section: "dayend", code: "D1", value: "BITEZO" }]));
});

describe.each(["DAYEND", "SHIFTEND"] as const)("%s print", (type) => {
  it("has no Tips or Purchase, even when the data has them", async () => {
    const t = text(await generateEndReportHtml(data as never, type));
    expect(t).not.toMatch(/tips/i);
    expect(t).not.toMatch(/purchase/i);
  });

  it("the Cash Flow adds up without Purchase", async () => {
    const t = text(await generateEndReportHtml(data as never, type));
    expect(t).toMatch(/Pay Out 2\.000 Total Cash Out 2\.000 Net Cash 14\.000 Closing Balance 14\.000 Difference 0\.000/);
  });

  it("the PDF has none either", async () => {
    const t = text(await generateEndReportHtml(data as never, type, true));
    expect(t).not.toMatch(/tips|purchase/i);
  });
});

describe("Day End / Shift End tables on screen", () => {
  const excluded = ["DayId", "SNo", "StartDate", "EndDate"];

  it.each(["Purchase", "PURCHASE", "Purchases", "Tips", "Tip", "tips", "Total Tips", "Total_Purchase", "Purchase Amount", "TipsAmount"])("%s is not a column", (name) => {
    expect(closingColumnNames(["Cash", name, "Total"], excluded)).toEqual(["Cash", "Opening Balance", "Pay In", "Pay Out", "Total"]);
  });

  it("keeps columns that only contain the word", () => {
    expect(closingColumnNames(["Purchase Return", "Stripe"], excluded)).toContain("Purchase Return");
  });

  it("the table and its totals leave them out", () => {
    const table = closingTable([{ Cash: "1", Purchase: "2", Tips: "3" }], ["Cash", "Purchase", "Tips"], excluded, []);
    expect(table.columns.map((c) => c.label)).toEqual(["Cash", "Opening Balance", "Pay In", "Pay Out"]);
    expect(table.rows[0]).not.toHaveProperty("Purchase");
    expect(table.rows[0]).not.toHaveProperty("Tips");
  });
});

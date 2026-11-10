// @vitest-environment jsdom
/** Purchase print preview: the PDF library loads on Export PDF, not with the page, and the export still works. */
import { createElement } from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const pdf = vi.hoisted(() => {
  const state = {
    loaded: { jspdf: false, autotable: false },
    created: [] as unknown[][],
    saved: [] as string[],
    autoTable: (() => {}) as (...args: unknown[]) => void,
  };
  return state;
});

vi.mock("jspdf", () => {
  pdf.loaded.jspdf = true;
  class FakePdf {
    constructor(...args: unknown[]) {
      pdf.created.push(args);
      return new Proxy(this, {
        get: (_target, key) => {
          if (key === "then") return undefined;
          if (key === "save") return (title: string) => pdf.saved.push(title);
          if (key === "lastAutoTable") return { finalY: 100 };
          if (key === "internal") return { pageSize: { getWidth: () => 210, getHeight: () => 297, width: 210, height: 297 } };
          if (key === "splitTextToSize") return (text: string) => [text];
          if (key === "getTextWidth") return () => 10;
          return () => undefined;
        },
      });
    }
  }
  return { default: FakePdf, jsPDF: FakePdf };
});
vi.mock("jspdf-autotable", () => {
  pdf.loaded.autotable = true;
  return { default: (...args: unknown[]) => pdf.autoTable(...args) };
});

const showToast = vi.fn();
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast }) }));
vi.mock("../features/company/services/companyApi", () => ({ fetchCompany: vi.fn(async () => ({ name: "Bitezo", taxRegNo: "T1" })) }));
vi.mock("../api/axiosInstance", () => ({ default: { get: vi.fn(async () => ({ data: { configs: [{ vatStatus: true }] } })) } }));

import { PurchasePrintPreviewModal } from "../features/transaction/shared/components/PurchasePrintPreviewModal";

const data = {
  docTitle: "Purchase Invoice",
  purchaseNo: "12",
  purchaseDate: "2026-11-05",
  supplierName: "Supplier",
  supplierAddress: "Manama",
  supplierTrn: "S1",
  voucherNo: "V1",
  date: "2026-11-05",
  paymode: "Cash",
  taxSummary: [{ taxCode: "VAT 10%", taxable: 10, vatAmount: 1, netAmount: 11 }],
  items: [{ slNo: 1, productName: "Rice", itemName: "Rice", barcode: "P1", code: "P1", unit: "Nos", unitName: "Nos", qty: 2, price: 5, rate: 5, total: 10, amount: 10, vat: 1, vatAmount: 1, netAmount: 11, netValue: 10 }],
  totals: { total: 10, discount: 0, vat: 1, adjustmentAmount: 0, roundOff: 0, grandTotal: 11 },
} as never;

const open = async () => {
  render(createElement(PurchasePrintPreviewModal, { isOpen: true, onClose: () => {}, data }));
  const button = screen.getByText("Export PDF").closest("button") as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
};

beforeEach(() => {
  vi.clearAllMocks();
  pdf.created.length = 0;
  pdf.saved.length = 0;
  pdf.autoTable = () => {};
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe("Purchase Export PDF", () => {
  it("does not load the PDF library until Export PDF is pressed", async () => {
    await open();
    expect(pdf.loaded).toEqual({ jspdf: false, autotable: false });
  });

  it("creates an A4 page and saves it under the document's name", async () => {
    fireEvent.click(await open());
    await waitFor(() => expect(pdf.saved).toEqual(["Purchase Invoice_12.pdf"]));
    expect(pdf.loaded).toEqual({ jspdf: true, autotable: true });
    expect(pdf.created).toEqual([["p", "mm", "a4"]]);
    expect(showToast).toHaveBeenCalledWith("PDF Downloaded successfully!", "success");
  });

  it("a failure is shown and nothing is saved", async () => {
    pdf.autoTable = () => { throw new Error("broken table"); };
    fireEvent.click(await open());
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Failed to generate PDF.", "error"));
    expect(pdf.saved).toEqual([]);
  });
});

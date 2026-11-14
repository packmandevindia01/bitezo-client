/**
 * Purchase Invoice → "New Product" → Product Master → back (2026-11-14).
 * The invoice as typed is kept in sessionStorage while the user makes the product in Product Master; coming back
 * (Back button, Save Product, or the browser's back) puts it back, with the new product on the first empty line.
 */
const DRAFT_KEY = "purchaseInvoiceDraft";
const CREATED_KEY = "purchaseInvoiceCreatedProduct";
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // a draft older than 2 hours is dropped

export interface PurchaseInvoiceDraft {
  path: string;
  savedAt: number;
  values: Record<string, unknown>;
  selectedPaymodeId: number;
}

export interface CreatedProductRef {
  id: number;
  name: string;
  code: string;
  barcode: string;
}

/** Only a Purchase Invoice page may be returned to (the address comes from the URL). */
export const isPurchaseInvoicePath = (path?: string | null): path is string =>
  !!path && /^\/dashboard\/purchase-invoice\/(new|edit\/\d+)$/.test(path);

/** The invoice page's address (routes: /dashboard/purchase-invoice/new and /edit/:id). */
export const purchaseInvoicePath = (invoiceId?: string) =>
  invoiceId ? `/dashboard/purchase-invoice/edit/${invoiceId}` : "/dashboard/purchase-invoice/new";

/** Product Master address that comes back to this invoice page. */
export const productMasterFromInvoice = (invoicePath: string) =>
  `/dashboard/products/add?returnTo=${encodeURIComponent(invoicePath)}`;

const read = <T,>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the invoice simply starts fresh */
  }
};

export const savePurchaseInvoiceDraft = (path: string, values: Record<string, unknown>, selectedPaymodeId: number) => {
  write(CREATED_KEY, null); // a product from an earlier trip must not be added to this one
  write(DRAFT_KEY, { path, savedAt: Date.now(), values, selectedPaymodeId } satisfies PurchaseInvoiceDraft);
};

/** The draft for this page, removed once taken. A draft for another page or a stale one is ignored. */
export const takePurchaseInvoiceDraft = (path: string): PurchaseInvoiceDraft | null => {
  const draft = read<PurchaseInvoiceDraft>(DRAFT_KEY);
  if (!draft || draft.path !== path) return null;
  write(DRAFT_KEY, null);
  return Date.now() - Number(draft.savedAt) > MAX_AGE_MS ? null : draft;
};

export const saveCreatedProduct = (product: CreatedProductRef) => write(CREATED_KEY, product);

export const takeCreatedProduct = (): CreatedProductRef | null => {
  const product = read<CreatedProductRef>(CREATED_KEY);
  write(CREATED_KEY, null);
  return product && Number(product.id) > 0 ? product : null;
};

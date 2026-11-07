import { useCallback, useEffect, useMemo, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { dec, sumMoney } from "../../../utils/money";
import { backofficeConfigApi } from "../../general/configuration/services/backofficeConfigApi";
import { subscribeToSupplierUpdates } from "../../general/supplier/utils/supplierSync";
import { calculatePurchaseLine, sumPurchaseLines } from "./purchaseCalc";
import { toNumber } from "./purchaseDocument";

interface Paymode { paymodeId: number; paymodeName: string }
interface Supplier { supplierId: number; supplierName: string }
interface FormLine { qty?: string | number; price?: string | number; vatPercent?: string | number }
interface Payment { mode: string; amount: string; paymodeId: number }
const NO_LINES: FormLine[] = [];

/**
 * What the Purchase Invoice and Purchase Return forms do the same way: reactive totals, paymodes, the bill
 * discount percent, and the supplier list. Each form keeps its own rules (load, save, invoice selection, balances).
 */
export const usePurchaseFormCommon = (args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each form has its own schema
  methods: UseFormReturn<any>;
  invoiceId?: string;
  paymodes: Paymode[] | undefined;
  decimalPart: number;
  formatAmount: (n: number) => string;
  searchSuppliers: (query: string) => Promise<Supplier[]>;
  setPayments: (payments: Payment[]) => void;
}) => {
  const { methods, invoiceId, paymodes, decimalPart, formatAmount, searchSuppliers, setPayments } = args;
  const { control, setValue } = methods;

  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);
  const [selectedPaymodeId, setSelectedPaymodeId] = useState<number>(0);
  const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: string }[]>([]);
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);

  const watchedItems = useWatch({ control, name: "items" }) ?? NO_LINES;
  const watchedDiscAmount = useWatch({ control, name: "discAmount" });
  const watchedOtherCharge = useWatch({ control, name: "otherCharge" });
  const watchedRoundOff = useWatch({ control, name: "roundOff" });
  const watchedPayments = useWatch({ control, name: "payments" }) || [];
  const watchedGlobalDiscPercent = useWatch({ control, name: "globalDiscPercent" });
  const watchedBranch = useWatch({ control, name: "branch" });

  const grossTotal = useMemo(
    () => sumMoney(watchedItems.map((item: FormLine) => dec(toNumber(item.qty)).times(toNumber(item.price)))),
    [watchedItems],
  );

  // Exact sum of the 14-dp lines (header always equals the lines); the discount is already inside netAmount.
  const totals = useMemo(() => {
    const globalDiscAmount = toNumber(watchedDiscAmount);
    const lines = watchedItems.map((item: FormLine) => calculatePurchaseLine(item.qty, item.price, item.vatPercent, grossTotal, globalDiscAmount));
    return sumPurchaseLines(lines, toNumber(watchedOtherCharge), toNumber(watchedRoundOff));
  }, [watchedDiscAmount, watchedOtherCharge, watchedRoundOff, watchedItems, grossTotal]);

  // All paymodes the API sends. MultiPay (found by name) opens the split modal.
  const paymodeList = useMemo(() => paymodes ?? [], [paymodes]);
  const multiPayId = useMemo(() => paymodeList.find((p) => p.paymodeName.toLowerCase().includes("multi"))?.paymodeId ?? 0, [paymodeList]);

  // A single payment follows the grand total.
  useEffect(() => {
    const current = methods.getValues("payments");
    if (current.length === 1 && selectedPaymodeId > 0 && selectedPaymodeId !== multiPayId) {
      const newAmount = Number(totals.grandTotal.toFixed(decimalPart));
      if (Number(current[0].amount) !== newAmount) methods.setValue("payments.0.amount", newAmount.toFixed(decimalPart));
    }
  }, [totals.grandTotal, selectedPaymodeId, multiPayId, decimalPart, methods]);

  // A new document starts on the branch's default paymode from the back office config.
  useEffect(() => {
    if (invoiceId || !watchedBranch || !paymodes) return;
    let active = true;
    backofficeConfigApi.getConfigData(Number(watchedBranch))
      .then((config) => {
        if (!active || !config || config.length === 0 || !config[0].paymodeId) return;
        const defaultPid = Number(config[0].paymodeId);
        const found = paymodes.find((p) => p.paymodeId === defaultPid);
        if (found && defaultPid > 0) {
          setSelectedPaymodeId(defaultPid);
          setPayments([{ mode: found.paymodeName.toLowerCase(), amount: totals.grandTotal.toFixed(decimalPart), paymodeId: defaultPid }]);
        }
      })
      .catch((err) => console.error("Failed to load branch backoffice config for default paymode", err));
    return () => { active = false; };
  }, [invoiceId, watchedBranch, paymodes, setPayments, totals.grandTotal, decimalPart]);

  // A bill discount given as a percent follows the lines.
  useEffect(() => {
    const discPct = toNumber(watchedGlobalDiscPercent);
    if (discPct > 0 && watchedItems.length > 0 && grossTotal > 0) {
      const newDiscAmt = formatAmount(grossTotal * (discPct / 100));
      if (newDiscAmt !== watchedDiscAmount) setValue("discAmount", newDiscAmt);
    }
  }, [watchedItems, watchedGlobalDiscPercent, setValue, formatAmount, watchedDiscAmount, grossTotal]);

  const handleSupplierSearch = useCallback(async (query: string) => {
    setSearchingSuppliers(true);
    try {
      const results = await searchSuppliers(query || "");
      setSupplierOptions(results.map((r) => ({ label: r.supplierName, value: r.supplierId.toString() })));
    } catch (error) {
      console.error("Failed to search suppliers", error);
    } finally {
      setSearchingSuppliers(false);
    }
  }, [searchSuppliers]);

  useEffect(() => {
    void handleSupplierSearch("");
  }, [handleSupplierSearch]);

  // Suppliers created or changed elsewhere appear at once.
  useEffect(() => subscribeToSupplierUpdates(() => {
    void handleSupplierSearch("");
  }), [handleSupplierSearch]);

  const handleSupplierCreated = useCallback((id: number, name: string) => {
    setSupplierOptions((prev) => [...prev, { label: name, value: String(id) }]);
    methods.setValue("supplier", String(id), { shouldValidate: true });
  }, [methods]);

  // One paymode pays the whole amount: no modal.
  const handleSinglePayment = useCallback((paymodeId: number, paymodeName: string, grandTotal: number) => {
    setPayments([{ mode: paymodeName.toLowerCase(), amount: grandTotal.toFixed(decimalPart), paymodeId }]);
    setSelectedPaymodeId(paymodeId);
  }, [setPayments, decimalPart]);

  const handleSettlementSubmit = (newPayments: { mode: string; paymodeId: number; amount: number }[]) => {
    setPayments(newPayments.map((p) => ({ mode: p.mode, amount: p.amount.toString(), paymodeId: p.paymodeId })));
    setSelectedPaymodeId(multiPayId || 3); // the master paymode of a split payment
    setIsMultiPayOpen(false);
  };

  return {
    watchedItems, watchedDiscAmount, watchedPayments, watchedBranch,
    grossTotal, totals,
    paymodeList, multiPayId, selectedPaymodeId, setSelectedPaymodeId, isMultiPayOpen, setIsMultiPayOpen,
    supplierOptions, setSupplierOptions, searchingSuppliers, handleSupplierSearch, handleSupplierCreated,
    handleSinglePayment, handleSettlementSubmit,
  };
};

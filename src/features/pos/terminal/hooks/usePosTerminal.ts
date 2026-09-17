import { usePosProducts } from "./usePosProducts";
import { usePosCartActions } from "./usePosCartActions";

export const usePosTerminal = () => {
  const products = usePosProducts();
  const cart = usePosCartActions();

  const tenderOptions = (products.paymodes || [])
    .slice()
    .sort((a, b) => {
      const aIsCash = Number(a.paymodeId) === 1 || (a.paymodeName || "").toLowerCase().includes("cash");
      const bIsCash = Number(b.paymodeId) === 1 || (b.paymodeName || "").toLowerCase().includes("cash");
      if (aIsCash && !bIsCash) return -1;
      if (!aIsCash && bIsCash) return 1;
      return Number(a.paymodeId) - Number(b.paymodeId);
    })
    .map(p => ({
      id: String(p.paymodeId),
      label: p.paymodeName
    }));

  return {
    ...products,
    ...cart,
    tenderOptions,
  };
};

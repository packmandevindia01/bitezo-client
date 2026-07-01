import { usePosProducts } from "./usePosProducts";
import { usePosCartActions } from "./usePosCartActions";

export const usePosTerminal = () => {
  const products = usePosProducts();
  const cart = usePosCartActions();

  const tenderOptions = products.paymodes?.map(p => ({
    id: String(p.paymodeId),
    label: p.paymodeName
  })) || [];

  return {
    ...products,
    ...cart,
    tenderOptions,
  };
};

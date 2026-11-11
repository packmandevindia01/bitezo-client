import { usePosProducts } from "./usePosProducts";
import { usePosCartActions } from "./usePosCartActions";
import { paymodesToTenderOptions } from "../utils/dineInTable";

export const usePosTerminal = () => {
  const products = usePosProducts();
  const cart = usePosCartActions();

  const tenderOptions = paymodesToTenderOptions(products.paymodes || []);

  return {
    ...products,
    ...cart,
    tenderOptions,
  };
};

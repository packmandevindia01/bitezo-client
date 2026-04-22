import { usePosProducts } from "./usePosProducts";
import { usePosCartActions } from "./usePosCartActions";
import { POS_ORDER_TYPES, POS_TENDER_OPTIONS } from "../constants";

export const usePosTerminal = () => {
  const products = usePosProducts();
  const cart = usePosCartActions();

  return {
    ...products,
    ...cart,
    orderTypes: POS_ORDER_TYPES,
    tenderOptions: POS_TENDER_OPTIONS,
  };
};

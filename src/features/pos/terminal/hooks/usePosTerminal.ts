import { usePosProducts } from "./usePosProducts";
import { usePosCartActions } from "./usePosCartActions";
import { POS_TENDER_OPTIONS } from "../../constants";

export const usePosTerminal = () => {
  const products = usePosProducts();
  const cart = usePosCartActions();

  return {
    ...products,
    ...cart,
    tenderOptions: POS_TENDER_OPTIONS,
  };
};

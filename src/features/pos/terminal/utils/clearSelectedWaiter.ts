import type { AppDispatch } from "../../../../app/store";
import { setWaiter } from "../store/posSlice";

/** Drops the waiter picked with the Waiter button (store and this device's saved copy). */
export const clearSelectedWaiter = (dispatch: AppDispatch) => {
  dispatch(setWaiter({ waiterId: null, waiterName: null }));
  localStorage.removeItem("selectedWaiterId");
  localStorage.removeItem("selectedWaiterName");
};

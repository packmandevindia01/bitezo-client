export interface LockedProduct {
  sNo: number;
  productName: string;
  lockUntil: string;
  productId: number;
  branchId: number;
}

export interface LockProductPayload {
  productId: number;
  lockUntil: string;
}

export interface LockItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

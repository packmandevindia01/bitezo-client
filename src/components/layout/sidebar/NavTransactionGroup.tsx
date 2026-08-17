import { FileText, ReceiptText, Repeat2 } from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";
import { usePermissions } from "../../../hooks/usePermissions";

interface NavTransactionGroupProps {
  navigate: (path: string) => void;
  onClose: () => void;
  itemClassName: string;
}

const NavTransactionGroup = ({ navigate, onClose, itemClassName }: NavTransactionGroupProps) => {
  const { hasPermission } = usePermissions();

  const handleItemClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <SidebarDropdown icon={<ReceiptText size={18} />} label="Transaction">
      {hasPermission("Purchase Invoice", "View") && (
        <div onClick={() => handleItemClick("/dashboard/purchase-invoice")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Purchase Invoice</span>
        </div>
      )}

      {hasPermission("Purchase Return", "View") && (
        <div onClick={() => handleItemClick("/dashboard/purchase-return")} className={itemClassName}>
          <Repeat2 size={13} className="shrink-0" />
          <span>Purchase Return</span>
        </div>
      )}

      {hasPermission("Production", "View") && (
        <div onClick={() => handleItemClick("/dashboard/production-list")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Production</span>
        </div>
      )}

      {hasPermission("Physical Entry", "View") && (
        <div onClick={() => handleItemClick("/dashboard/physical-entries")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Physical Entry</span>
        </div>
      )}

      {hasPermission("Stock Adjustment", "View") && (
        <div onClick={() => handleItemClick("/dashboard/stock-adjustments")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Stock Adjustment</span>
        </div>
      )}

      {hasPermission("Internal Stock Transfer", "View") && (
        <div onClick={() => handleItemClick("/dashboard/internal-stock-transfers")} className={itemClassName}>
          <Repeat2 size={13} className="shrink-0" />
          <span>Internal Stock Transfer</span>
        </div>
      )}

      {hasPermission("Payment Against Voucher", "View") && (
        <div onClick={() => handleItemClick("/dashboard/payment-against-voucher")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Payment Against Voucher</span>
        </div>
      )}

      {hasPermission("Receipt Against Voucher", "View") && (
        <div onClick={() => handleItemClick("/dashboard/receipt-against-voucher")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Receipt Against Voucher</span>
        </div>
      )}

      {hasPermission("Payment Voucher", "View") && (
        <div onClick={() => handleItemClick("/dashboard/payment-voucher")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Payment Voucher</span>
        </div>
      )}

      {hasPermission("Receipt Voucher", "View") && (
        <div onClick={() => handleItemClick("/dashboard/receipt-voucher")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Receipt Voucher</span>
        </div>
      )}

      {(hasPermission("Sales Invoice", "View") || hasPermission("Sales Report", "View") || hasPermission("Bulk Settlement", "View")) && (
        <div onClick={() => handleItemClick("/dashboard/bulk-settlement")} className={itemClassName}>
          <FileText size={13} className="shrink-0" />
          <span>Bulk Settlement</span>
        </div>
      )}
    </SidebarDropdown>
  );
};

export default NavTransactionGroup;

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
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Purchase Invoice</span>
          </div>
        </div>
      )}

      {hasPermission("Purchase Return", "View") && (
        <div onClick={() => handleItemClick("/dashboard/purchase-return")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Repeat2 size={14} />
            <span>Purchase Return</span>
          </div>
        </div>
      )}

      {hasPermission("Production", "View") && (
        <div onClick={() => handleItemClick("/dashboard/production")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Production</span>
          </div>
        </div>
      )}

      {hasPermission("Stock Adjustment", "View") && (
        <div onClick={() => handleItemClick("/dashboard/stock-adjustment")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Stock Adjustment</span>
          </div>
        </div>
      )}

      {hasPermission("Payment Against Voucher", "View") && (
        <div onClick={() => handleItemClick("/dashboard/payment-against-voucher")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Payment Against Voucher</span>
          </div>
        </div>
      )}



      {hasPermission("Receipt Against Voucher", "View") && (
        <div onClick={() => handleItemClick("/dashboard/receipt-against-voucher")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Receipt Against Voucher</span>
          </div>
        </div>
      )}



      {hasPermission("Payment Voucher", "View") && (
        <div onClick={() => handleItemClick("/dashboard/payment-voucher")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Payment Voucher</span>
          </div>
        </div>
      )}



      {hasPermission("Receipt Voucher", "View") && (
        <div onClick={() => handleItemClick("/dashboard/receipt-voucher")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Receipt Voucher</span>
          </div>
        </div>
      )}


    </SidebarDropdown>
  );
};

export default NavTransactionGroup;

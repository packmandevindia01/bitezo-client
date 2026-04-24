import { FileText, ReceiptText, Repeat2 } from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";

interface NavTransactionGroupProps {
  navigate: (path: string) => void;
  onClose: () => void;
  itemClassName: string;
}

const NavTransactionGroup = ({ navigate, onClose, itemClassName }: NavTransactionGroupProps) => {
  const handleItemClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <SidebarDropdown icon={<ReceiptText size={18} />} label="Transaction">
      <div onClick={() => handleItemClick("/dashboard/purchase-invoice")} className={itemClassName}>
        <div className="flex items-center gap-2">
          <FileText size={14} />
          <span>Purchase Invoice</span>
        </div>
      </div>

      <div onClick={() => handleItemClick("/dashboard/purchase-return")} className={itemClassName}>
        <div className="flex items-center gap-2">
          <Repeat2 size={14} />
          <span>Purchase Return</span>
        </div>
      </div>
    </SidebarDropdown>
  );
};

export default NavTransactionGroup;

import { BarChart3, TrendingUp, ShoppingCart, PackageSearch } from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";
import { usePermissions } from "../../../hooks/usePermissions";

interface NavReportGroupProps {
  navigate: (path: string) => void;
  onClose: () => void;
  itemClassName: string;
}

const NavReportGroup = ({ navigate, onClose, itemClassName }: NavReportGroupProps) => {
  const { hasPermission } = usePermissions();

  const handleItemClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <SidebarDropdown icon={<BarChart3 size={18} />} label="Reports">
      {hasPermission("Sales Report", "View") && (
        <div onClick={() => handleItemClick("/dashboard/reports/sales")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} />
            <span>Sales Report</span>
          </div>
        </div>
      )}

      {hasPermission("Purchase Report", "View") && (
        <SidebarDropdown icon={<ShoppingCart size={14} />} label="Purchase Report" nested={true}>
          <div onClick={() => handleItemClick("/dashboard/reports/purchase")} className={itemClassName}>
            <span>Purchase Summary</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/product-wise-purchase")} className={itemClassName}>
            <span>Product Wise Purchase</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/stock-register")} className={itemClassName}>
            <span>Stock Register Report</span>
          </div>
        </SidebarDropdown>
      )}

      {hasPermission("Purchase Return Report", "View") && (
        <div onClick={() => handleItemClick("/dashboard/reports/purchase-return")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} />
            <span>Purchase Return Report</span>
          </div>
        </div>
      )}

      {hasPermission("Stock Report", "View") && (
        <div onClick={() => handleItemClick("/dashboard/reports/stock")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <PackageSearch size={14} />
            <span>Stock Report</span>
          </div>
        </div>
      )}
    </SidebarDropdown>
  );
};

export default NavReportGroup;

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
      {/* We use "Sales Report" permission as a fallback for the Summary since there's no "Summary Report" permission explicitly mentioned */}
      {hasPermission("Sales Report", "View") && (
        <SidebarDropdown icon={<BarChart3 size={14} />} label="Summary" nested={true}>
          <div onClick={() => handleItemClick("/dashboard/reports/all-transaction")} className={itemClassName}>
            <BarChart3 size={13} className="shrink-0" />
            <span>All Transaction Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/supplier-statement")} className={itemClassName}>
            <BarChart3 size={13} className="shrink-0" />
            <span>Supplier Statement</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/customer-statement")} className={itemClassName}>
            <BarChart3 size={13} className="shrink-0" />
            <span>Customer Statement</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/day-end-report")} className={itemClassName}>
            <BarChart3 size={13} className="shrink-0" />
            <span>Day End Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/shift-end-report")} className={itemClassName}>
            <BarChart3 size={13} className="shrink-0" />
            <span>Shift End Report</span>
          </div>
        </SidebarDropdown>
      )}

      {hasPermission("Sales Report", "View") && (
        <SidebarDropdown icon={<TrendingUp size={14} />} label="Sales Report" nested={true}>
          <div onClick={() => handleItemClick("/dashboard/reports/sales")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Sales Summary</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/daily-sales")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Daily Sales Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/hourly-sales")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Hourly Sales Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/order-type-sales")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Order Type Sales Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/group-wise-sales")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Group Wise Sales Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/category-wise-sales")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Category Wise Sales Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/monthly-sales")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Monthly Sales Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/bill-wise-margin")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Bill Wise Margin Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/product-wise-margin")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Product Wise Margin Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/employee-sales-report")} className={itemClassName}>
            <TrendingUp size={13} className="shrink-0" />
            <span>Employee Sales Report</span>
          </div>
        </SidebarDropdown>
      )}

      {hasPermission("Purchase Report", "View") && (
        <SidebarDropdown icon={<ShoppingCart size={14} />} label="Purchase Report" nested={true}>
          <div onClick={() => handleItemClick("/dashboard/reports/purchase")} className={itemClassName}>
            <ShoppingCart size={13} className="shrink-0" />
            <span>Purchase Summary</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/product-wise-purchase")} className={itemClassName}>
            <ShoppingCart size={13} className="shrink-0" />
            <span>Product Wise Purchase</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/stock-register")} className={itemClassName}>
            <ShoppingCart size={13} className="shrink-0" />
            <span>Stock Register Report</span>
          </div>
          <div onClick={() => handleItemClick("/dashboard/reports/stock-adjustment")} className={itemClassName}>
            <ShoppingCart size={13} className="shrink-0" />
            <span>Stock Adjustment Report</span>
          </div>
        </SidebarDropdown>
      )}

      {hasPermission("Purchase Return Report", "View") && (
        <div onClick={() => handleItemClick("/dashboard/reports/purchase-return")} className={itemClassName}>
          <ShoppingCart size={13} className="shrink-0" />
          <span>Purchase Return Report</span>
        </div>
      )}

      {hasPermission("Stock Report", "View") && (
        <>

          <div onClick={() => handleItemClick("/dashboard/reports/product-transaction-log")} className={itemClassName}>
            <PackageSearch size={13} className="shrink-0" />
            <span>Product Transaction Log</span>
          </div>
        </>
      )}
    </SidebarDropdown>
  );
};

export default NavReportGroup;

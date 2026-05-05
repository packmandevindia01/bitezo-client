import { ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";

const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith("/dashboard/branches/add")) return "Branch Master > Create";
  if (pathname.includes("/dashboard/branches/edit/")) return "Branch Master > Edit";
  if (pathname.startsWith("/dashboard/branches")) return "Branch Master";

  if (pathname.startsWith("/dashboard/products/add")) return "Product Master > Create";
  if (pathname.includes("/dashboard/products/edit/")) return "Product Master > Edit";
  if (pathname.startsWith("/dashboard/products")) return "Product Master";

  if (pathname.startsWith("/dashboard/providers/new")) return "Provider Master > Create";
  if (pathname.includes("/dashboard/providers/edit/")) return "Provider Master > Edit";
  if (pathname.startsWith("/dashboard/providers")) return "Provider Master";

  if (pathname.startsWith("/dashboard/happy-hour/new")) return "Happy Hour > Create";
  if (pathname.includes("/dashboard/happy-hour/edit/")) return "Happy Hour > Edit";
  if (pathname.startsWith("/dashboard/happy-hour")) return "Happy Hour";

  if (pathname.startsWith("/dashboard/provider-settings/new")) return "Provider Settings > Create";
  if (pathname.includes("/dashboard/provider-settings/edit/")) return "Provider Settings > Edit";
  if (pathname.startsWith("/dashboard/provider-settings")) return "Provider Settings";

  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/users": "Users",
    "/dashboard/user-roles": "User Roles",
    "/dashboard/customers": "Customers",
    "/dashboard/customers/new": "New Customer",
    "/dashboard/employees": "Employees",
    "/dashboard/paymodes": "Pay Modes",
    "/dashboard/counters": "Counters",
    "/dashboard/sections": "Sections",
    "/dashboard/tables": "Table Master",
    "/dashboard/pos-terminal": "POS Terminal",
    "/dashboard/categories": "Categories",
    "/dashboard/sub-categories": "Sub Categories",
    "/dashboard/groups": "Groups",
    "/dashboard/units": "Units",
    "/dashboard/modifiers": "Modifiers",
    "/dashboard/voucher-series": "Voucher Series",
    "/dashboard/extras-master": "Extras Master",
    "/dashboard/extras-type": "Extras Type",
    "/dashboard/modifier-type": "Modifier Type",
    "/dashboard/taxes": "Tax Master",
    "/dashboard/purchase-invoice": "Purchase Invoice",
    "/dashboard/purchase-return": "Purchase Return",
    "/dashboard/production": "Production",
    "/dashboard/stock-adjustment": "Stock Adjustment",
    "/dashboard/payment-against-voucher": "Payment Against Voucher",
    "/dashboard/receipt-against-voucher": "Receipt Against Voucher",
    "/dashboard/payment-voucher": "Payment Voucher",
    "/dashboard/receipt-voucher": "Receipt Voucher",
    "/dashboard/recipes": "Recipes",
    "/dashboard/bom": "BOM Master",
    "/dashboard/configuration": "Configuration",
    "/cashier/in": "Cashier In — Open Shift",
    "/cashier/out": "Cashier Out — Close Shift",
    "/system/register": "System Registration",
  };
  return map[pathname] ?? "Dashboard";
};

const TopbarBreadcrumbs = () => {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="hidden text-gray-400 sm:block">Bitezo</span>
      {pageTitle.split(" > ").map((segment, index) => {
        const isLast = index === pageTitle.split(" > ").length - 1;
        const isPrimary = index === 0;

        return (
          <div key={index} className="flex items-center gap-1.5 font-semibold">
            <ChevronRight size={13} className="text-gray-300" />
            <span className={`
              rounded-md transition-all duration-200
              ${isPrimary 
                ? "bg-[#49293e] px-3 py-1 text-[12px] uppercase tracking-wider text-white shadow-md shadow-[#49293e]/20" 
                : isLast ? "text-gray-700 ml-1" : "text-gray-400 ml-1"
              }
            `}>
              {segment}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default TopbarBreadcrumbs;

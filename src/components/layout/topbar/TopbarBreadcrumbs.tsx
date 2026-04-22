import { ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";

const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith("/dashboard/branches/add")) return "Branch Master > Create";
  if (pathname.includes("/dashboard/branches/edit/")) return "Branch Master > Edit";
  if (pathname.startsWith("/dashboard/branches")) return "Branch Master";

  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/users": "Users",
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
    "/dashboard/products": "Products",
    "/dashboard/voucher-series": "Voucher Series",
    "/dashboard/extras-master": "Extras Master",
    "/dashboard/extras-type": "Extras Type",
    "/dashboard/modifier-type": "Modifier Type",
    "/dashboard/taxes": "Tax Master",
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
        const isStyled = segment === "Branch Master";

        return (
          <div key={index} className="flex items-center gap-1.5 font-semibold">
            <ChevronRight size={13} className="text-gray-300" />
            <span className={`
              rounded-md transition-colors
              ${isStyled 
                ? "bg-[#49293e] px-3 py-1 text-[13px] text-white shadow-sm" 
                : isLast ? "text-gray-700" : "text-gray-400"
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

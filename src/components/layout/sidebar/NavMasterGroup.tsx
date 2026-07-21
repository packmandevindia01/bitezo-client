import {
  Package,
  Layers3,
  ShieldUser,
  ShieldCheck,
  Building2,
  UserCog,
  Ticket,
  Store,
  Percent,
  UtensilsCrossed,
  SlidersHorizontal,
  ListTree,
  Shapes,
  Grid2x2,
  PackageSearch,
  Tags,
  Boxes,
  Ruler,
  PackagePlus,
  Coins,
  Globe,
} from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";
import { usePermissions } from "../../../hooks/usePermissions";

interface NavMasterGroupProps {
  navigate: (path: string) => void;
  onClose: () => void;
  itemClassName: string;
  onOpenDenomination: () => void;
}

const NavMasterGroup = ({ navigate, onClose, itemClassName, onOpenDenomination }: NavMasterGroupProps) => {
  const { hasPermission } = usePermissions();

  const handleItemClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleDenominationClick = () => {
    onOpenDenomination();
    onClose();
  };

  return (
    <SidebarDropdown icon={<Package size={18} />} label="Master">
      <SidebarDropdown label="General" icon={<Layers3 size={14} />} nested defaultOpen>
        {hasPermission("User Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/users")} className={itemClassName}>
            <ShieldUser size={13} className="shrink-0" />
            <span>Users</span>
          </div>
        )}

        {hasPermission("User Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/user-roles")} className={itemClassName}>
            <ShieldCheck size={13} className="shrink-0" />
            <span>User Roles</span>
          </div>
        )}

        {hasPermission("Employee Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/employee-roles")} className={itemClassName}>
            <ShieldCheck size={13} className="shrink-0" />
            <span>Employee Roles</span>
          </div>
        )}

        {hasPermission("Customer Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/company")} className={itemClassName}>
            <Building2 size={13} className="shrink-0" />
            <span>Company</span>
          </div>
        )}

        {hasPermission("Customer Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/customers")} className={itemClassName}>
            <UserCog size={13} className="shrink-0" />
            <span>Customer</span>
          </div>
        )}

        {hasPermission("Employee Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/employees")} className={itemClassName}>
            <UserCog size={13} className="shrink-0" />
            <span>Employees</span>
          </div>
        )}

        {hasPermission("Paymode Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/paymodes")} className={itemClassName}>
            <Ticket size={13} className="shrink-0" />
            <span>Paymode</span>
          </div>
        )}

        {hasPermission("Counter Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/counters")} className={itemClassName}>
            <Store size={13} className="shrink-0" />
            <span>Counter</span>
          </div>
        )}

        {hasPermission("Tax Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/taxes")} className={itemClassName}>
            <Percent size={13} className="shrink-0" />
            <span>Tax Master</span>
          </div>
        )}

        {hasPermission("Denomination Master", "View") && (
          <div onClick={handleDenominationClick} className={itemClassName}>
            <Coins size={13} className="shrink-0" />
            <span>Denomination</span>
          </div>
        )}

        {hasPermission("Recipe Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/recipes")} className={itemClassName}>
            <UtensilsCrossed size={13} className="shrink-0" />
            <span>Recipe</span>
          </div>
        )}

        {hasPermission("BOM Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/boms")} className={itemClassName}>
            <Boxes size={13} className="shrink-0" />
            <span>BOM</span>
          </div>
        )}

        {hasPermission("Provider Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/providers")} className={itemClassName}>
            <Globe size={13} className="shrink-0" />
            <span>Provider Master</span>
          </div>
        )}

        {hasPermission("Supplier Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/suppliers")} className={itemClassName}>
            <Building2 size={13} className="shrink-0" />
            <span>Supplier Master</span>
          </div>
        )}
      </SidebarDropdown>

      <SidebarDropdown label="Order" icon={<UtensilsCrossed size={14} />} nested defaultOpen>
        {hasPermission("Section Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/sections")} className={itemClassName}>
            <Layers3 size={13} className="shrink-0" />
            <span>Section</span>
          </div>
        )}

        {hasPermission("Menu Settings", "View") && (
          <div onClick={() => handleItemClick("/dashboard/menu-settings")} className={itemClassName}>
            <UtensilsCrossed size={13} className="shrink-0" />
            <span>Menu Settings</span>
          </div>
        )}

        {hasPermission("Modifier Type", "View") && (
          <div onClick={() => handleItemClick("/dashboard/modifier-type")} className={itemClassName}>
            <SlidersHorizontal size={13} className="shrink-0" />
            <span>Modifier Type</span>
          </div>
        )}

        {hasPermission("Modifier Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/modifiers")} className={itemClassName}>
            <SlidersHorizontal size={13} className="shrink-0" />
            <span>Modifier</span>
          </div>
        )}

        {hasPermission("Extras Type", "View") && (
          <div onClick={() => handleItemClick("/dashboard/extras-type")} className={itemClassName}>
            <ListTree size={13} className="shrink-0" />
            <span>Extras Type</span>
          </div>
        )}

        {hasPermission("Extras Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/extras-master")} className={itemClassName}>
            <Shapes size={13} className="shrink-0" />
            <span>Extras Master</span>
          </div>
        )}

        {hasPermission("Table Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/tables")} className={itemClassName}>
            <Grid2x2 size={13} className="shrink-0" />
            <span>Table Master</span>
          </div>
        )}
      </SidebarDropdown>

      <SidebarDropdown label="Inventory" icon={<PackageSearch size={14} />} nested defaultOpen>
        {hasPermission("Branch Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/branches")} className={itemClassName}>
            <Store size={13} className="shrink-0" />
            <span>Branch</span>
          </div>
        )}

        {hasPermission("Category Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/categories")} className={itemClassName}>
            <Tags size={13} className="shrink-0" />
            <span>Category</span>
          </div>
        )}

        {hasPermission("Sub Category Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/sub-categories")} className={itemClassName}>
            <Boxes size={13} className="shrink-0" />
            <span>Sub Category</span>
          </div>
        )}

        {hasPermission("Group Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/groups")} className={itemClassName}>
            <Grid2x2 size={13} className="shrink-0" />
            <span>Group</span>
          </div>
        )}

        {hasPermission("Unit Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/units")} className={itemClassName}>
            <Ruler size={13} className="shrink-0" />
            <span>Unit</span>
          </div>
        )}

        {hasPermission("Product Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/products")} className={itemClassName}>
            <PackagePlus size={13} className="shrink-0" />
            <span>Product</span>
          </div>
        )}

        {hasPermission("Voucher Series Master", "View") && (
          <div onClick={() => handleItemClick("/dashboard/voucher-series")} className={itemClassName}>
            <Ticket size={13} className="shrink-0" />
            <span>Voucher Series</span>
          </div>
        )}

        {hasPermission("Stock Adjustment Type", "View") && (
          <div onClick={() => handleItemClick("/dashboard/stock-adjustment-type")} className={itemClassName}>
            <SlidersHorizontal size={13} className="shrink-0" />
            <span>Stock Adj. Type</span>
          </div>
        )}
      </SidebarDropdown>
    </SidebarDropdown>
  );
};

export default NavMasterGroup;

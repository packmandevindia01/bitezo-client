import {
  Package,
  Layers3,
  ShieldUser,
  Users,
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
} from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";

interface NavMasterGroupProps {
  navigate: (path: string) => void;
  onClose: () => void;
  itemClassName: string;
  onOpenDenomination: () => void;
}

const NavMasterGroup = ({ navigate, onClose, itemClassName, onOpenDenomination }: NavMasterGroupProps) => {
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
        <div onClick={() => handleItemClick("/dashboard/users")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <ShieldUser size={14} />
            <span>Users</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/customers")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Users size={14} />
            <span>Customers</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/employees")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <UserCog size={14} />
            <span>Employees</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/paymodes")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Ticket size={14} />
            <span>Paymode</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/counters")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Store size={14} />
            <span>Counter</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/taxes")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Percent size={14} />
            <span>Tax Master</span>
          </div>
        </div>

        <div onClick={handleDenominationClick} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Coins size={14} />
            <span>Denomination</span>
          </div>
        </div>
      </SidebarDropdown>

      <SidebarDropdown label="Order" icon={<UtensilsCrossed size={14} />} nested defaultOpen>
        <div onClick={() => handleItemClick("/dashboard/sections")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Layers3 size={14} />
            <span>Section</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/modifier-type")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} />
            <span>Modifier Type</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/modifiers")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} />
            <span>Modifier</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/extras-type")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <ListTree size={14} />
            <span>Extras Type</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/extras-master")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Shapes size={14} />
            <span>Extras Master</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/tables")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Grid2x2 size={14} />
            <span>Table Master</span>
          </div>
        </div>
      </SidebarDropdown>

      <SidebarDropdown label="Inventory" icon={<PackageSearch size={14} />} nested defaultOpen>
        <div onClick={() => handleItemClick("/dashboard/branches")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Store size={14} />
            <span>Branch</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/categories")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Tags size={14} />
            <span>Category</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/sub-categories")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Boxes size={14} />
            <span>Sub Category</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/groups")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Grid2x2 size={14} />
            <span>Group</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/units")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Ruler size={14} />
            <span>Unit</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/products")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <PackagePlus size={14} />
            <span>Product</span>
          </div>
        </div>

        <div onClick={() => handleItemClick("/dashboard/voucher-series")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Ticket size={14} />
            <span>Voucher Series</span>
          </div>
        </div>
      </SidebarDropdown>
    </SidebarDropdown>
  );
};

export default NavMasterGroup;

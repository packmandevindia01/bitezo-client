import { BarChart3 } from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";
import { usePermissions } from "../../../hooks/usePermissions";

interface NavReportGroupProps {
  onClose: () => void;
}

const NavReportGroup = ({ onClose }: NavReportGroupProps) => {
  const { hasPermission } = usePermissions();

  return (
    <SidebarDropdown icon={<BarChart3 size={18} />} label="Reports">
      {hasPermission("Sales Report", "View") && (
        <div 
          className="cursor-pointer px-6 py-2 text-sm hover:text-[#49293e]"
          onClick={onClose}
        >
          Sales Report
        </div>
      )}

      {hasPermission("Purchase Report", "View") && (
        <div 
          className="cursor-pointer px-6 py-2 text-sm hover:text-[#49293e]"
          onClick={onClose}
        >
          Purchase Report
        </div>
      )}

      {hasPermission("Stock Report", "View") && (
        <div 
          className="cursor-pointer px-6 py-2 text-sm hover:text-[#49293e]"
          onClick={onClose}
        >
          Stock Report
        </div>
      )}
    </SidebarDropdown>
  );
};

export default NavReportGroup;

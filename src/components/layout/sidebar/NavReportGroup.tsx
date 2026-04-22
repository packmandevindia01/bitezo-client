import { BarChart3 } from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";

interface NavReportGroupProps {
  onClose: () => void;
}

const NavReportGroup = ({ onClose }: NavReportGroupProps) => {
  return (
    <SidebarDropdown icon={<BarChart3 size={18} />} label="Reports">
      <div 
        className="cursor-pointer px-6 py-2 text-sm hover:text-[#49293e]"
        onClick={onClose}
      >
        Sales Report
      </div>

      <div 
        className="cursor-pointer px-6 py-2 text-sm hover:text-[#49293e]"
        onClick={onClose}
      >
        Stock Report
      </div>
    </SidebarDropdown>
  );
};

export default NavReportGroup;

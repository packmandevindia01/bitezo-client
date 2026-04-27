import { Settings } from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";
import { usePermissions } from "../../../hooks/usePermissions";

interface NavSettingsGroupProps {
  navigate: (path: string) => void;
  onClose: () => void;
  itemClassName: string;
}

const NavSettingsGroup = ({ navigate, onClose, itemClassName }: NavSettingsGroupProps) => {
  const { hasPermission } = usePermissions();

  const handleItemClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <SidebarDropdown icon={<Settings size={18} />} label="Settings">
      {hasPermission("Configuration", "View") && (
        <div onClick={() => handleItemClick("/dashboard/configuration")} className={itemClassName}>
          <div className="flex items-center gap-2">
            <Settings size={14} />
            <span>Configuration</span>
          </div>
        </div>
      )}
    </SidebarDropdown>
  );
};

export default NavSettingsGroup;

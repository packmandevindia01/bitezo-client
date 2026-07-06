import { Settings, Clock } from "lucide-react";
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
          <Settings size={13} className="shrink-0" />
          <span>Configuration</span>
        </div>
      )}
      {hasPermission("Configuration", "View") && (
        <div onClick={() => handleItemClick("/dashboard/backoffice-configuration")} className={itemClassName}>
          <Settings size={13} className="shrink-0" />
          <span>Backoffice Configuration</span>
        </div>
      )}
      {hasPermission("Configuration", "View") && (
        <div onClick={() => handleItemClick("/dashboard/provider-settings")} className={itemClassName}>
          <Settings size={13} className="shrink-0" />
          <span>Provider Settings</span>
        </div>
      )}
      {hasPermission("Configuration", "View") && (
        <div onClick={() => handleItemClick("/dashboard/happy-hour")} className={itemClassName}>
          <Clock size={13} className="shrink-0" />
          <span>Happy Hour</span>
        </div>
      )}
    </SidebarDropdown>
  );
};

export default NavSettingsGroup;

import { HelpCircle, Info, CreditCard } from "lucide-react";
import SidebarDropdown from "../SidebarDropdown";

interface NavHelpGroupProps {
  navigate: (path: string) => void;
  onClose: () => void;
  itemClassName: string;
}

// Help menu (2026-11-14): Subscription first, then About Us. Open to every user, no permission check.
const NavHelpGroup = ({ navigate, onClose, itemClassName }: NavHelpGroupProps) => {
  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <SidebarDropdown icon={<HelpCircle size={18} />} label="Help">
      <div onClick={() => go("/dashboard/subscription")} className={itemClassName}>
        <CreditCard size={13} className="shrink-0" />
        <span>Subscription</span>
      </div>
      <div onClick={() => go("/dashboard/about-us")} className={itemClassName}>
        <Info size={13} className="shrink-0" />
        <span>About Us</span>
      </div>
    </SidebarDropdown>
  );
};

export default NavHelpGroup;

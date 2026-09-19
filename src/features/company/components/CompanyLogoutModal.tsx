import { LogOut } from "lucide-react";
import { Button, Modal } from "../../../components/common";

interface CompanyLogoutModalProps {
  isOpen: boolean;
  countdown: number;
  onProceed: () => void;
}

export const CompanyLogoutModal: React.FC<CompanyLogoutModalProps> = ({
  isOpen,
  countdown,
  onProceed,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onProceed}
      showClose={false}
      size="md"
      className="p-6"
    >
      <div className="flex flex-col items-center text-center">
        {/* Animated / styled icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 mb-3 shadow-sm">
          <LogOut className="h-7 w-7 animate-pulse" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          Company Updated Successfully
        </h3>

        {/* Simple Explanation */}
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Your company details have been saved. You are being logged out to apply the changes. Please log in again to continue.
        </p>

        {/* Countdown Progress */}
        <div className="mt-5 w-full space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Redirecting to login</span>
            <span className="font-bold text-[#49293e] bg-[#49293e]/10 px-2.5 py-0.5 rounded-full">
              in {countdown} second{countdown !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#49293e] transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, (countdown / 5) * 100))}%` }}
            />
          </div>
        </div>

        {/* Immediate Action Button */}
        <div className="mt-6 w-full">
          <Button
            type="button"
            onClick={onProceed}
            className="w-full justify-center !py-2.5 shadow-md"
            isAction
            icon={<LogOut size={16} />}
          >
            Log In Now
          </Button>
        </div>
      </div>
    </Modal>
  );
};

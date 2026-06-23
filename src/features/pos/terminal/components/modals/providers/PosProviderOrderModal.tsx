import { useState } from "react";
import { Modal, Button, FormInput } from "../../../../../../components/common";
import { TouchKeyboard } from "../../../../../../components/common/TouchKeyboard";
import type { MenuProvider } from "../../../../types";

interface PosProviderOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: MenuProvider | null;
  onSubmit: (orderNo: string) => void;
}

export const PosProviderOrderModal = ({ isOpen, onClose, provider, onSubmit }: PosProviderOrderModalProps) => {
  const [orderNo, setOrderNo] = useState("");

  // Reset state when opening a new provider
  if (!isOpen && orderNo !== "") {
    setOrderNo("");
  }

  const handleSubmit = () => {
    if (!orderNo.trim()) return;
    onSubmit(orderNo);
    onClose();
  };

  if (!provider) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Enter ${provider.providerName} Order No`}
        className="w-full max-w-[95vw] md:max-w-4xl"
      >
        <div className="p-3 md:p-4 flex flex-col gap-3">
          <div className="relative">
            <FormInput
              label="Provider Order Number"
              value={orderNo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderNo(e.target.value)}
              placeholder="e.g. 12345 or ORD-99"
              autoFocus
              inputMode="text"
              inputClassName="text-xl font-bold tracking-widest uppercase"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && orderNo.trim()) {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
            <TouchKeyboard
              layout="qwerty"
              embedded={true}
              hideCloseKey={true}
              onEnter={handleSubmit}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button 
              variant="secondary" 
              onClick={() => setOrderNo("")} 
              className="px-6"
              disabled={!orderNo}
              tabIndex={-1}
            >
              Clear
            </Button>
            <Button onClick={handleSubmit} disabled={!orderNo.trim()} className="px-8">
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

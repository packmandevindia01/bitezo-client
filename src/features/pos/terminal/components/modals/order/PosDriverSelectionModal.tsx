import { useState, useEffect } from "react";
import { Modal, Button } from "../../../../../../components/common";
import { Truck, X } from "lucide-react";
import { employeeService } from "../../../../../general/employee/services/employeeService";
import { orderApi } from "../../../../services/orderApi";
import { useToast } from "../../../../../../app/providers/useToast";
import { Loader } from "../../../../../../components/common";

import { useAppSelector } from "../../../../../../app/hooks";

interface PosDriverSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  onSuccess: () => void;
}

export const PosDriverSelectionModal = ({
  isOpen,
  onClose,
  orderId,
  onSuccess,
}: PosDriverSelectionModalProps) => {
  const [drivers, setDrivers] = useState<{ driverId: number; driverName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const { showToast } = useToast();
  
  const authBranchId = useAppSelector(state => state.auth.activeBranchId || state.auth.branchId);

  const [branchIdDebug, setBranchIdDebug] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setSelectedDriverId(null);
      const posBranchId = Number(localStorage.getItem("systemBranchId"));
      const branchId = authBranchId || Number(localStorage.getItem("activeBranchId")) || Number(localStorage.getItem("branchId")) || posBranchId || 1;
      setBranchIdDebug(branchId);
      
      console.log("Fetching drivers for branch:", branchId);
      setLoading(true);
      employeeService.getDrivers(branchId)
        .then((data: {driverId: number, driverName: string}[]) => {
          setDrivers(data);
        })
        .catch((err: any) => {
          console.error(err);
          showToast("Failed to fetch drivers", "error");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, showToast]);

  const handleUpdateDriver = async (driverId: number) => {
    if (!orderId) return;
    setSaving(true);
    try {
      const res = await orderApi.updateRecallDriver(orderId, driverId);
      if (res && res.isSuccess !== false) {
        showToast("Driver updated successfully", "success");
        onSuccess();
      } else {
        throw new Error(res.message || "Failed to update driver");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to update driver", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Driver"
      className="max-w-md"
    >
      <div className="p-4 space-y-4 min-h-[300px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader text="Loading Drivers..." />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '400px' }}>
              <div className="grid grid-cols-2 gap-3 content-start">
                {drivers.length === 0 && (
                  <div className="col-span-2 text-center text-gray-500 py-8">
                    No drivers found for this branch. (Branch ID: {branchIdDebug})
                  </div>
                )}
                {drivers.map((driver) => (
                  <button
                    key={driver.driverId}
                    onClick={() => setSelectedDriverId(driver.driverId)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                      selectedDriverId === driver.driverId
                        ? "border-[#f48120] bg-[#f48120]/10 text-[#f48120]"
                        : "border-gray-200 bg-white hover:border-[#f48120]/50 hover:bg-gray-50"
                    }`}
                  >
                    <Truck size={24} />
                    <span className="font-bold text-sm text-center">{driver.driverName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 flex justify-between items-center mt-auto gap-3">
              <Button
                variant="secondary"
                className="text-red-600 border-red-200 hover:bg-red-50"
                icon={<X size={16} />}
                onClick={() => handleUpdateDriver(0)}
                disabled={saving}
                isAction
              >
                Remove Driver
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedDriverId && handleUpdateDriver(selectedDriverId)}
                  disabled={!selectedDriverId || saving}
                  loading={saving}
                  isAction
                >
                  Confirm Driver
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { PageShell, Button, RecordTableCard, Modal } from "../../../../components/common";
import { useConfigurationManager } from "../hooks/useConfigurationManager";
import { BackofficeSettingsTab } from "../components/BackofficeSettingsTab";

const BackofficeConfigurationPage = () => {
  const { 
    backofficeForm, 
    saving, 
    setBackofficeField, 
    handleBackofficeSave,
    backofficeBranches,
    selectedBranch,
    setSelectedBranch,
    loadingBackoffice,
    productTypeOptions,
    vatOptions,
  } = useConfigurationManager();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfigureClick = (branchId: string) => {
    setSelectedBranch(branchId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedBranch(""), 200);
  };

  const onSave = async () => {
    const success = await handleBackofficeSave();
    if (success) {
      handleCloseModal();
    }
  };

  return (
    <PageShell title="Backoffice Configuration">
      <div className="flex flex-col gap-4">
        
        {/* Branches Table */}
        <RecordTableCard
          title="Branches"
          data={backofficeBranches}
          rowKey="value"
          columns={[
            { header: "Branch Name", accessor: "label" },
            { 
              header: "Actions", 
              accessor: "value",
              render: (row) => (
                <button
                  onClick={() => handleConfigureClick(row.value)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#49293e]/10 px-3 py-1.5 text-sm font-medium text-[#49293e] transition hover:bg-[#49293e]/20"
                >
                  <Settings2 size={16} />
                  Configure
                </button>
              )
            }
          ]}
        />

        {/* Configuration Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={`Configure Branch: ${backofficeBranches.find(b => b.value === selectedBranch)?.label || ""}`}
          size="2xl"
        >
          <div className="p-4 md:p-6 min-h-[400px]">
            {loadingBackoffice ? (
              <div className="flex h-64 items-center justify-center text-gray-400">
                Loading configuration...
              </div>
            ) : (
              <BackofficeSettingsTab 
                form={backofficeForm} 
                onChange={setBackofficeField}
                productTypeOptions={productTypeOptions}
                vatOptions={vatOptions}
              />
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 p-4">
            <Button onClick={handleCloseModal} variant="secondary" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSave} loading={saving} disabled={saving || loadingBackoffice}>
              Save Configuration
            </Button>
          </div>
        </Modal>

      </div>
    </PageShell>
  );
};

export default BackofficeConfigurationPage;

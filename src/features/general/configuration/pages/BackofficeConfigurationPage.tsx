import { Save } from "lucide-react";
import { PageShell, Button } from "../../../../components/common";
import { useConfigurationManager } from "../hooks/useConfigurationManager";
import { BackofficeSettingsTab } from "../components/BackofficeSettingsTab";

const BackofficeConfigurationPage = () => {
  const { backofficeForm, saving, setBackofficeField, handleSave } = useConfigurationManager();

  return (
    <PageShell title="Backoffice Configuration">
      <div className="flex flex-col gap-4">
        {/* Header Actions */}
        <div className="flex items-center justify-end bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <Button
            onClick={handleSave}
            disabled={saving}
            isAction
            loading={saving}
            icon={<Save size={18} />}
          >
            Save Changes
          </Button>
        </div>

        {/* Content */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm min-h-[500px]">
          <BackofficeSettingsTab form={backofficeForm} onChange={setBackofficeField} />
        </div>
      </div>
    </PageShell>
  );
};

export default BackofficeConfigurationPage;

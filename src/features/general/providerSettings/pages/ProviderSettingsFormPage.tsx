import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader, PageShell } from "../../../../components/common";
import ProviderSettingsForm from "../components/ProviderSettingsForm";
import { useProviderSettingsList } from "../hooks/useProviderSettingsList";

const ProviderSettingsFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const {
    editData, detailLoading, saving,
    handleEdit, handleSave,
  } = useProviderSettingsList();

  useEffect(() => {
    if (id) {
      void handleEdit(Number(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const goBack = () => navigate("/dashboard/provider-settings");

  const onSave = async (payload: Parameters<typeof handleSave>[0]) => {
    await handleSave(payload);
    goBack();
  };

  return (
    <PageShell title={id ? "Edit Provider Settings" : "Create Provider Settings"}>
      <div
        className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col"
        style={{ height: "calc(100vh - 80px)" }}
      >
        {/* Removed redundant header. Title is in Topbar Breadcrumbs */}

        {/* Content */}
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader text="Loading details..." />
          </div>
        ) : (
          <ProviderSettingsForm
            initialData={editData}
            onSubmit={onSave}
            onCancel={goBack}
            submitting={saving}
          />
        )}
      </div>
    </PageShell>
  );
};

export default ProviderSettingsFormPage;

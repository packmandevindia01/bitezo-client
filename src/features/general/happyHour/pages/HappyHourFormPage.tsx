import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader, PageShell } from "../../../../components/common";
import HappyHourForm from "../components/HappyHourForm";
import { useHappyHourList } from "../hooks/useHappyHourList";

const HappyHourFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const {
    editData, detailLoading, saving,
    handleEdit, handleSave,
  } = useHappyHourList();

  useEffect(() => {
    if (id) {
      void handleEdit(Number(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const goBack = () => navigate("/dashboard/happy-hour");

  const onSave = async (payload: Parameters<typeof handleSave>[0]) => {
    await handleSave(payload);
    goBack();
  };

  return (
    <PageShell title={id ? "Edit Happy Hour" : "Create Happy Hour"}>
      <div
        className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col"
        style={{ maxHeight: "calc(100vh - 80px)" }}
      >
        {/* Removed redundant header. Title is in Topbar Breadcrumbs */}

        {/* Content */}
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader text="Loading details..." />
          </div>
        ) : (
          <HappyHourForm
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

export default HappyHourFormPage;

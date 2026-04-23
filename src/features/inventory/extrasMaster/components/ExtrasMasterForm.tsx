import { Trash2 } from "lucide-react";
import { Button } from "../../../../components/common";
import type { ExtrasMasterForm as ExtrasMasterFormType } from "../types";
import type { ExtrasTypeRecord } from "../../extrasType/types";
import type { CategoryListItem } from "../../category/types";
import ExtrasBasicFields from "./form/ExtrasBasicFields";
import ExtrasAllocationSections from "./form/ExtrasAllocationSections";

interface ExtrasMasterFormProps {
  form: ExtrasMasterFormType;
  isEditing: boolean;
  saving: boolean;
  loading: boolean;
  branches: { id: number; name: string }[];
  categories: CategoryListItem[];
  extrasTypes: ExtrasTypeRecord[];
  branchAllocOpen: boolean;
  categoryAllocOpen: boolean;
  onChange: <K extends keyof ExtrasMasterFormType>(
    key: K,
    value: ExtrasMasterFormType[K]
  ) => void;
  onToggleBranch: (branchId: number) => void;
  onToggleCategory: (categoryId: number) => void;
  onToggleBranchAlloc: () => void;
  onToggleCategoryAlloc: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const ExtrasMasterForm = ({
  form,
  isEditing,
  saving,
  loading,
  branches,
  categories,
  extrasTypes,
  branchAllocOpen,
  categoryAllocOpen,
  onChange,
  onToggleBranch,
  onToggleCategory,
  onToggleBranchAlloc,
  onToggleCategoryAlloc,
  onClear,
  onSave,
  onDelete,
}: ExtrasMasterFormProps) => {
  const typeOptions = extrasTypes.map((t) => ({
    label: t.name,
    value: String(t.typeId || (t as any).id),
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#49293e] border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Loading details...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <ExtrasBasicFields 
          form={form}
          typeOptions={typeOptions}
          onChange={onChange}
        />

        <ExtrasAllocationSections 
          form={form}
          branches={branches}
          categories={categories}
          branchAllocOpen={branchAllocOpen}
          categoryAllocOpen={categoryAllocOpen}
          saving={saving}
          onToggleBranch={onToggleBranch}
          onToggleCategory={onToggleCategory}
          onToggleBranchAlloc={onToggleBranchAlloc}
          onToggleCategoryAlloc={onToggleCategoryAlloc}
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
        <Button variant="secondary" onClick={onClear} disabled={saving}>
          Clear
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : isEditing ? "Update" : "Save"}
        </Button>
        {isEditing && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
          >
            <Trash2 size={16} />
            Delete Extra
          </Button>
        )}
      </div>
    </>
  );
};

export default ExtrasMasterForm;

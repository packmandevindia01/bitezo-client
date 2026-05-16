import type { ModifierForm } from "../types";
import type { ModifierTypeRecord } from "../../modifierType/types";
import type { CategoryListItem } from "../../category/types";
import ModifierBasicFields from "./form/ModifierBasicFields";
import ModifierAllocationSections from "./form/ModifierAllocationSections";

interface ModifierMasterFormProps {
  form: ModifierForm;
  loading?: boolean;
  branches: { id: number; name: string }[];
  categories: CategoryListItem[];
  modifierTypes: ModifierTypeRecord[];
  branchAllocOpen: boolean;
  categoryAllocOpen: boolean;
  onChange: <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => void;
  onToggleBranch: (id: number) => void;
  onToggleCategory: (id: number) => void;
  onToggleBranchAlloc: () => void;
  onToggleCategoryAlloc: () => void;
}

const ModifierMasterForm = ({
  form,
  loading = false,
  branches,
  categories,
  modifierTypes,
  branchAllocOpen,
  categoryAllocOpen,
  onChange,
  onToggleBranch,
  onToggleCategory,
  onToggleBranchAlloc,
  onToggleCategoryAlloc,
}: ModifierMasterFormProps) => {
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
      <div className="space-y-4">
        <ModifierBasicFields 
          form={form}
          modifierTypes={modifierTypes}
          onChange={onChange}
        />

        <ModifierAllocationSections 
          form={form}
          branches={branches}
          categories={categories}
          branchAllocOpen={branchAllocOpen}
          categoryAllocOpen={categoryAllocOpen}
          onToggleBranch={onToggleBranch}
          onToggleCategory={onToggleCategory}
          onToggleBranchAlloc={onToggleBranchAlloc}
          onToggleCategoryAlloc={onToggleCategoryAlloc}
        />
      </div>
    </>
  );
};

export default ModifierMasterForm;

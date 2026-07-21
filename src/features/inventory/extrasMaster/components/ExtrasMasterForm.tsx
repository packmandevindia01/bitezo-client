import { useState, useMemo } from "react";
import { LayoutGrid, ListTree, Building2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { SearchBar } from "../../../../components/common";
import type { ExtrasMasterForm as ExtrasMasterFormType } from "../schemas";
import type { CategoryListItem } from "../../category/types";
import ExtrasBasicFields from "./form/ExtrasBasicFields";

interface ExtrasMasterFormProps {
  form: UseFormReturn<ExtrasMasterFormType>;
  saving: boolean;
  loading: boolean;
  branches: { id: number; name: string }[];
  categories: CategoryListItem[];
}

const ExtrasMasterForm = ({
  form,
  saving,
  loading,
  branches,
  categories,
}: ExtrasMasterFormProps) => {
  const [activeTab, setActiveTab] = useState<"general" | "categories" | "branches">("general");
  const [categorySearch, setCategorySearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    const lower = categorySearch.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(lower));
  }, [categories, categorySearch]);

  const filteredBranches = useMemo(() => {
    if (!branchSearch) return branches;
    const lower = branchSearch.toLowerCase();
    return branches.filter(b => b.name.toLowerCase().includes(lower));
  }, [branches, branchSearch]);

  const onToggleCategory = (categoryId: number) => {
    const current = form.getValues("categoryIds") || [];
    if (current.includes(categoryId)) {
      form.setValue("categoryIds", current.filter((id) => id !== categoryId), { shouldValidate: true });
    } else {
      form.setValue("categoryIds", [...current, categoryId], { shouldValidate: true });
    }
  };

  const onToggleBranch = (branchId: number) => {
    const current = form.getValues("branchIds") || [];
    if (current.includes(branchId)) {
      form.setValue("branchIds", current.filter((id) => id !== branchId), { shouldValidate: true });
    } else {
      form.setValue("branchIds", [...current, branchId], { shouldValidate: true });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#49293e] border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Loading details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-fit gap-2 rounded-xl bg-gray-50 p-1.5 border border-gray-100">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeTab === "general"
                ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
            }`}
          >
            <LayoutGrid size={14} />
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeTab === "categories"
                ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
            }`}
          >
            <ListTree size={14} />
            Category Allocation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("branches")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeTab === "branches"
                ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
            }`}
          >
            <Building2 size={14} />
            Branch Allocation
          </button>
        </div>
      </div>

      {form.formState.errors.branchIds && activeTab !== "branches" && (
        <p className="text-red-500 text-sm">{form.formState.errors.branchIds.message}</p>
      )}

      <div className="flex-1 min-h-[350px]">
        {activeTab === "general" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <ExtrasBasicFields form={form} />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="rounded-xl border border-[#49293e]/10 bg-[#49293e]/5 p-4 flex flex-col h-[350px] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#49293e]/60">Category Allocation</p>
              <div className="w-full sm:w-64">
                <SearchBar
                  value={categorySearch}
                  onChange={setCategorySearch}
                  placeholder="Search categories..."
                  disabled={saving}
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
              {filteredCategories.length === 0 ? (
                <p className="text-[10px] text-gray-400">No categories found.</p>
              ) : (
                filteredCategories.map((cat) => {
                  const active = form.watch("categoryIds")?.includes(cat.id);
                  return (
                    <div key={cat.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm shrink-0">
                      <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => onToggleCategory(cat.id)}
                        disabled={saving}
                        className={`rounded-md px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                          active
                            ? "bg-[#49293e] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                        }`}
                        tabIndex={-1}
                      >
                        {active ? "Allocated" : "Allocate"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "branches" && (
          <div className="rounded-xl border border-[#49293e]/10 bg-[#49293e]/5 p-4 flex flex-col h-[350px] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#49293e]/60">Branch Allocation</p>
              <div className="w-full sm:w-64">
                <SearchBar
                  value={branchSearch}
                  onChange={setBranchSearch}
                  placeholder="Search branches..."
                  disabled={saving}
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
              {filteredBranches.length === 0 ? (
                <p className="text-[10px] text-gray-400">No branches found.</p>
              ) : (
                filteredBranches.map((branch) => {
                  const active = form.watch("branchIds")?.includes(branch.id);
                  return (
                    <div key={branch.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm shrink-0">
                      <span className="text-sm font-medium text-gray-700">{branch.name}</span>
                      <button
                        type="button"
                        onClick={() => onToggleBranch(branch.id)}
                        disabled={saving}
                        className={`rounded-md px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                          active
                            ? "bg-[#49293e] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                        }`}
                        tabIndex={-1}
                      >
                        {active ? "Allocated" : "Allocate"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtrasMasterForm;

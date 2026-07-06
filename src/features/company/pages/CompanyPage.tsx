import { useRef } from "react";
import { Building2, Save, RotateCcw } from "lucide-react";
import { Button, FormInput, Loader, PageShell, SelectInput } from "../../../components/common";
import { useCompanyForm } from "../hooks/useCompanyForm";

const CompanyPage = () => {
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);
  
  const {
    form: {
      register,
      formState: { errors },
    },
    currencies,
    isLoading,
    isSaving,
    onSubmit,
    handleReset,
  } = useCompanyForm();

  const currencyOptions = currencies.map((item) => ({
    label: item.currencyName,
    value: item.currencyId.toString(),
  }));

  if (isLoading) {
    return (
      <PageShell title="Company">
        <div className="flex items-center justify-center py-24">
          <Loader text="Loading company information..." />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Company">
      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col"
        style={{ height: "calc(100vh - 120px)" }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Settings</p>
          <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900 mt-0.5">
            <Building2 size={22} className="text-[#49293e]" />
            Company Information
          </h1>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2 lg:grid-cols-3">
            <FormInput
              id="co-reg-id"
              label="Registration ID"
              {...register("regId")}
              disabled
              readOnly
              tabIndex={-1}
              inputClassName="cursor-not-allowed"
            />

            {/* Read-Only Company Name */}
            <FormInput
              id="co-name"
              label="Company Name"
              {...register("custName")}
              error={errors.custName?.message}
              disabled
              readOnly
              tabIndex={-1}
              inputClassName="cursor-not-allowed"
            />

            {/* Editable fields start here, so CR No is autofocus */}
            <FormInput
              id="co-cr-no"
              label="CR No"
              required
              autoFocus
              {...register("crNo")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-mobile")?.focus();
                }
              }}
              error={errors.crNo?.message}
              disabled={isSaving}
              tabIndex={1}
            />

            <FormInput
              id="co-mobile"
              label="Mobile No"
              required
              placeholder="+973 36001234"
              {...register("custMob")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-tel")?.focus();
                }
              }}
              error={errors.custMob?.message}
              disabled={isSaving}
              tabIndex={2}
            />

            {/* Read-Only Email */}
            <FormInput
              id="co-email"
              label="Email Address"
              {...register("email")}
              error={errors.email?.message}
              disabled
              readOnly
              tabIndex={-1}
              inputClassName="cursor-not-allowed"
            />

            <FormInput
              id="co-tel"
              label="Tel No / Landline"
              {...register("custMob2")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-tax-no")?.focus();
                }
              }}
              error={errors.custMob2?.message}
              disabled={isSaving}
              tabIndex={3}
            />

            <FormInput
              id="co-tax-no"
              label="Tax Reg No"
              {...register("taxRegNo")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-currency")?.focus();
                }
              }}
              disabled={isSaving}
              tabIndex={4}
            />

            <SelectInput
              id="co-currency"
              label="Currency"
              required
              {...register("currency")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-block")?.focus();
                }
              }}
              options={currencyOptions}
              error={errors.currency?.message}
              disabled={isSaving}
              tabIndex={5}
            />

            <FormInput
              id="co-block"
              label="Block No"
              {...register("block")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-area")?.focus();
                }
              }}
              disabled={isSaving}
              tabIndex={6}
            />

            <FormInput
              id="co-area"
              label="Area / Street"
              {...register("area")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-building")?.focus();
                }
              }}
              disabled={isSaving}
              tabIndex={7}
            />

            <FormInput
              id="co-building"
              label="Building No"
              {...register("building")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-road")?.focus();
                }
              }}
              disabled={isSaving}
              tabIndex={8}
            />

            <FormInput
              id="co-road"
              label="Road No"
              {...register("road")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("co-flat")?.focus();
                }
              }}
              disabled={isSaving}
              tabIndex={9}
            />

            <FormInput
              id="co-flat"
              label="Flat / Shop No"
              {...register("flatNo")}
              disabled={isSaving}
              tabIndex={10}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveBtnRef.current?.focus();
                }
              }}
            />
          </div>
        </div>

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 rounded-b-3xl">
          <Button 
            type="button"
            variant="secondary" 
            onClick={handleReset} 
            disabled={isSaving} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            type="submit"
            ref={saveBtnRef} 
            disabled={isSaving}
            isAction
            loading={isSaving}
            icon={<Save size={18} />}
          >
            Update
          </Button>
        </div>
      </form>
    </PageShell>
  );
};

export default CompanyPage;

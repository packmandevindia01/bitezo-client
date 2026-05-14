import { useEffect, useRef, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { Button, FormInput, Loader, SelectInput } from "../../../components/common";
import { useToast } from "../../../app/providers/useToast";
import { isRequired, isValidEmail, isValidMobile } from "../../../lib/validators";
import { createCompany, fetchCompanyMasterload } from "../services/companyApi";
import type { CompanyFormData, CompanyMasterOption } from "../types";

import { formatPhone } from "../utils/formatters";

const initialState: CompanyFormData = {
  custName: "",
  custMob: "",
  custMob2: "",

  block: "",
  area: "",
  road: "",
  building: "",
  flatNo: "",
  branchCount: 0,
  regId: "",
  startDate: "",
  isDemo: true,
  database: "",
  crNo: "",
  email: "",
  taxRegNo: "",
  currency: "",
// decimals: "",
  customerId: "",
};




const fallbackCurrencies: CompanyMasterOption[] = [
  { id: 1, name: "INR - Indian Rupee", code: "INR" },
  { id: 2, name: "AED - UAE Dirham", code: "AED" },
  { id: 3, name: "SAR - Saudi Riyal", code: "SAR" },
  { id: 4, name: "BHD - Bahraini Dinar", code: "BHD" },
  { id: 5, name: "OMR - Omani Rial", code: "OMR" },
  { id: 6, name: "QAR - Qatari Riyal", code: "QAR" },
  { id: 7, name: "KWD - Kuwaiti Dinar", code: "KWD" },
  { id: 8, name: "SGD - Singapore Dollar", code: "SGD" },
  { id: 9, name: "MYR - Malaysian Ringgit", code: "MYR" },
  { id: 10, name: "THB - Thai Baht", code: "THB" },
];

const resetCompanyForm = () => ({
  ...initialState,
  startDate: new Date().toISOString(),
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
};

interface CompanyFormProps {
  initialValues?: Partial<CompanyFormData>;
  lockedFields?: (keyof CompanyFormData)[];
  submitLabel?: string;
  onSuccess?: () => void;
  clientDb?: string;
  tempToken?: string;
}

const CompanyForm = ({
  initialValues,
  lockedFields = [],
  submitLabel = "Save",
  onSuccess,
  clientDb = "",
  tempToken = "",
}: CompanyFormProps) => {
  const { showToast } = useToast();
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  const createFormState = (): CompanyFormData => ({
    ...resetCompanyForm(),
    ...initialValues,
  });

  const [form, setForm] = useState<CompanyFormData>(createFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  const [currencyMaster, setCurrencyMaster] = useState<CompanyMasterOption[]>(fallbackCurrencies);

  const isLocked = (field: keyof CompanyFormData) => lockedFields.includes(field);

  useEffect(() => {
    // Explicit focus on mount: skip read-only fields
    setTimeout(() => {
      const regField = document.getElementById("co-regId") as HTMLInputElement;
      if (regField && !regField.readOnly) {
        regField.focus();
      } else {
        document.getElementById("co-custName")?.focus();
      }
    }, 200);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMasterData = async () => {
      try {
        setLoadingMasterData(true);
        const response = await fetchCompanyMasterload();
        const currencies =
          response.data?.currencies ??
          response.data?.currencyList ??
          response.data?.currency ??
          [];

        if (cancelled) return;

        if (currencies.length > 0) {
          setCurrencyMaster(currencies);
        }
      } catch {
        if (!cancelled) {
          setCurrencyMaster(fallbackCurrencies);
          showToast("Company master data is unavailable, so demo fallback values are being used.", "error");
        }
      } finally {
        if (!cancelled) {
          setLoadingMasterData(false);
        }
      }
    };

    void loadMasterData();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleChange = <K extends keyof CompanyFormData>(key: K, value: CompanyFormData[K]) => {
    if (submitting) return;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!isRequired(form.custName)) newErrors.custName = "Company name is required";
    if (!isRequired(form.crNo ?? "")) newErrors.crNo = "CR No is required";

    if (!isRequired(form.custMob)) {
      newErrors.custMob = "Mobile number is required";
    } else if (!isValidMobile(form.custMob)) {
      newErrors.custMob = "Invalid mobile number";
    }


    if (!isRequired(form.currency)) newErrors.currency = "Currency is required";

    if (form.email && !isValidEmail(form.email)) {
      newErrors.email = "Invalid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Default to Bahrain for mobile formatting since country select is removed
  const countryCode = "BH" as CountryCode;

  const currencyOptions = currencyMaster.map((item) => ({
    label: item.name,
    value: item.id.toString(),
  }));

  const handleSubmit = async () => {
    if (!validate()) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      await createCompany(
        {
          ...form,
          custMob: formatPhone(form.custMob.trim(), countryCode),
          startDate: new Date().toISOString(),
        },
        clientDb,
        tempToken
      );

      showToast("Company created successfully", "success");
      setForm(createFormState());
      onSuccess?.();
    } catch (error) {
      console.error(error);
      showToast(getErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      } else {
        saveBtnRef.current?.focus();
      }
    }
  };

  const handleIdChange = (field: keyof CompanyFormData, value: string) => {
    const formatted = value.toUpperCase().replace(/\s/g, "");
    handleChange(field, formatted);
  };

  return (
    <>
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Loader text="Creating Company..." />
        </div>
      )}

      {loadingMasterData && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2 animate-pulse">
          <span className="h-2 w-2 bg-amber-400 rounded-full" />
          Loading secure configuration data...
        </div>
      )}

      <div className="space-y-8">
        {/* SECTION 1: GENERAL INFO */}
        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#49293e] rounded-full" />
            <h3 className="text-sm font-black text-[#49293e] uppercase tracking-[0.2em]">General Information</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <FormInput
              id="co-regId"
              label="Registration ID"
              required
              tabIndex={1}
              value={form.regId}
              onChange={(e) => handleIdChange("regId", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-custName")}
              disabled={submitting}
              readOnly={isLocked("regId")}
              autoFocus
              className="bg-white"
            />

            <FormInput
              id="co-custName"
              label="Company Name"
              required
              tabIndex={2}
              value={form.custName}
              onChange={(e) => handleChange("custName", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-crNo")}
              error={errors.custName}
              disabled={submitting}
              readOnly={isLocked("custName")}
              className="bg-white"
            />

            <FormInput
              id="co-crNo"
              label="CR Number"
              required
              tabIndex={3}
              value={form.crNo}
              onChange={(e) => handleIdChange("crNo", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-taxRegNo")}
              error={errors.crNo}
              disabled={submitting}
              readOnly={isLocked("crNo")}
              className="bg-white"
            />

            <FormInput
              id="co-taxRegNo"
              label="Tax Registration No"
              tabIndex={4}
              value={form.taxRegNo}
              onChange={(e) => handleIdChange("taxRegNo", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-currency")}
              disabled={submitting}
              readOnly={isLocked("taxRegNo")}
              className="bg-white"
            />

            <SelectInput
              id="co-currency"
              label="Primary Currency"
              required
              tabIndex={5}
              value={form.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-custMob")}
              options={currencyOptions}
              error={errors.currency}
              disabled={submitting}
              className="bg-white"
            />
          </div>
        </div>

        {/* SECTION 2: CONTACT DETAILS */}
        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#49293e] rounded-full" />
            <h3 className="text-sm font-black text-[#49293e] uppercase tracking-[0.2em]">Contact Details</h3>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <FormInput
              id="co-custMob"
              label="Mobile Number"
              required
              tabIndex={6}
              placeholder="+973 36001234"
              value={form.custMob}
              onChange={(e) => handleChange("custMob", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-custMob2")}
              error={errors.custMob}
              disabled={submitting}
              readOnly={isLocked("custMob")}
              className="bg-white"
            />

            <FormInput
              id="co-custMob2"
              label="Landline / Alt Mobile"
              tabIndex={7}
              value={form.custMob2}
              onChange={(e) => handleChange("custMob2", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-email")}
              disabled={submitting}
              readOnly={isLocked("custMob2")}
              className="bg-white"
            />

            <FormInput
              id="co-email"
              label="Email Address"
              tabIndex={8}
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-area")}
              error={errors.email}
              disabled={submitting}
              readOnly={isLocked("email")}
              className="bg-white"
            />
          </div>
        </div>

        {/* SECTION 3: ADDRESS INFORMATION */}
        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#49293e] rounded-full" />
            <h3 className="text-sm font-black text-[#49293e] uppercase tracking-[0.2em]">Address Information</h3>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
            <FormInput
              id="co-area"
              label="Area / Street"
              tabIndex={9}
              value={form.area}
              onChange={(e) => handleChange("area", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-block")}
              disabled={submitting}
              readOnly={isLocked("area")}
              className="bg-white"
            />

            <FormInput
              id="co-block"
              label="Block No"
              tabIndex={10}
              value={form.block}
              onChange={(e) => handleChange("block", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-building")}
              disabled={submitting}
              readOnly={isLocked("block")}
              className="bg-white"
            />

            <FormInput
              id="co-building"
              label="Building"
              tabIndex={11}
              value={form.building}
              onChange={(e) => handleChange("building", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-road")}
              disabled={submitting}
              readOnly={isLocked("building")}
              className="bg-white"
            />

            <FormInput
              id="co-road"
              label="Road No"
              tabIndex={12}
              value={form.road}
              onChange={(e) => handleChange("road", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-flatNo")}
              disabled={submitting}
              readOnly={isLocked("road")}
              className="bg-white"
            />

            <FormInput
              id="co-flatNo"
              label="Flat / Shop No"
              tabIndex={13}
              value={form.flatNo}
              onChange={(e) => handleChange("flatNo", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "co-customerId")}
              disabled={submitting}
              readOnly={isLocked("flatNo")}
              className="bg-white"
            />

            <FormInput
              id="co-customerId"
              label="Internal Customer ID"
              tabIndex={14}
              value={form.customerId}
              onChange={(e) => handleIdChange("customerId", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              disabled={submitting}
              readOnly={isLocked("customerId")}
              className="bg-white"
            />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 pt-8">
        <Button 
          variant="secondary" 
          onClick={() => setForm(createFormState())} 
          disabled={submitting}
          className="px-8 font-bold border-slate-200"
          tabIndex={16}
        >
          Reset Form
        </Button>

        <Button 
          ref={saveBtnRef} 
          onClick={handleSubmit} 
          disabled={submitting}
          tabIndex={15}
          className="px-16 py-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-[#49293e]/20"
        >
          {submitting ? "Processing..." : submitLabel}
        </Button>
      </div>
    </>
  );
};

export default CompanyForm;


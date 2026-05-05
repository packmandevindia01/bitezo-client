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

  return (
    <>
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader />
        </div>
      )}

      {loadingMasterData && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Loading company master data...
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput
          id="co-regId"
          label="Registration ID"
          required
          value={form.regId}
          onChange={(e) => handleChange("regId", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-custName")}
          disabled={submitting}
          readOnly={isLocked("regId")}
          autoFocus
        />

        <FormInput
          id="co-custName"
          label="Company Name"
          required
          value={form.custName}
          onChange={(e) => handleChange("custName", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-crNo")}
          error={errors.custName}
          disabled={submitting}
          readOnly={isLocked("custName")}
        />

        <FormInput
          id="co-crNo"
          label="CR No"
          required
          value={form.crNo}
          onChange={(e) => handleChange("crNo", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-custMob")}
          error={errors.crNo}
          disabled={submitting}
          readOnly={isLocked("crNo")}
        />

        <FormInput
          id="co-custMob"
          label="Mobile No"
          required
          placeholder="+973 36001234"
          value={form.custMob}
          onChange={(e) => handleChange("custMob", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-email")}
          error={errors.custMob}
          disabled={submitting}
          readOnly={isLocked("custMob")}
        />

        <FormInput
          id="co-email"
          label="Email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-custMob2")}
          error={errors.email}
          disabled={submitting}
          readOnly={isLocked("email")}
        />

        <FormInput
          id="co-custMob2"
          label="Tel No"
          value={form.custMob2}
          onChange={(e) => handleChange("custMob2", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-taxRegNo")}
          disabled={submitting}
          readOnly={isLocked("custMob2")}
        />

        <FormInput
          id="co-taxRegNo"
          label="Tax Reg No"
          value={form.taxRegNo}
          onChange={(e) => handleChange("taxRegNo", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-currency")}
          disabled={submitting}
          readOnly={isLocked("taxRegNo")}
        />

        <SelectInput
          id="co-currency"
          label="Currency"
          required
          value={form.currency}
          onChange={(e) => handleChange("currency", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-block")}
          options={currencyOptions}
          error={errors.currency}
          disabled={submitting}
        />

        <FormInput
          id="co-block"
          label="Block No"
          value={form.block}
          onChange={(e) => handleChange("block", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-area")}
          disabled={submitting}
          readOnly={isLocked("block")}
        />

        <FormInput
          id="co-area"
          label="Area / Street"
          value={form.area}
          onChange={(e) => handleChange("area", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-customerId")}
          disabled={submitting}
          readOnly={isLocked("area")}
        />

        <FormInput
          id="co-customerId"
          label="Customer ID"
          value={form.customerId}
          onChange={(e) => handleChange("customerId", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-building")}
          disabled={submitting}
          readOnly={isLocked("customerId")}
        />

        <FormInput
          id="co-building"
          label="Building No"
          value={form.building}
          onChange={(e) => handleChange("building", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-road")}
          disabled={submitting}
          readOnly={isLocked("building")}
        />

        <FormInput
          id="co-road"
          label="Road No"
          value={form.road}
          onChange={(e) => handleChange("road", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "co-flatNo")}
          disabled={submitting}
          readOnly={isLocked("road")}
        />

        <FormInput
          id="co-flatNo"
          label="Flat No"
          value={form.flatNo}
          onChange={(e) => handleChange("flatNo", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e)}
          disabled={submitting}
          readOnly={isLocked("flatNo")}
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={() => setForm(createFormState())} disabled={submitting}>
          Clear
        </Button>

        <Button ref={saveBtnRef} onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </>
  );
};

export default CompanyForm;

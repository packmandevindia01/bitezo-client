import { useState, useRef } from "react";
import { FormInput, Button, SelectInput, Loader } from "../../../components/common";
import { createCompany } from "../services/companyApi";
import type { CompanyFormData } from "../types";
import { useToast } from "../../../context/ToastContext";
import type { CountryCode } from "libphonenumber-js";
import { mapCountry } from "../utils/countryMapper";
import { formatPhone } from "../utils/formatters";
import { isRequired, isValidMobile, isNumber, isValidEmail } from "../../../utils/validators";

const initialState: CompanyFormData = {
  custName: "",
  custMob: "",
  custMob2: "",
  country: "",
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
  decimals: "",
  customerId: "",
};

const mobilePlaceholders: Record<string, string> = {
  IN: "+91 9876543210",
  AE: "+971 501234567",
  SA: "+966 512345678",
  BH: "+973 36001234",
  OM: "+968 92001234",
  QA: "+974 33001234",
  KW: "+965 51001234",
  SG: "+65 91234567",
  MY: "+60 121234567",
  TH: "+66 812345678",
};

const CompanyForm = () => {
  const { showToast } = useToast();
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  const [form, setForm] = useState<CompanyFormData>({
    ...initialState,
    startDate: new Date().toISOString(),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CompanyFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key: keyof CompanyFormData, value: any) => {
    if (submitting) return;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!isRequired(form.custName)) newErrors.custName = "Company name is required";
    if (!isRequired(form.crNo)) newErrors.crNo = "CR No is required";
    if (!isRequired(form.custMob)) {
      newErrors.custMob = "Mobile number is required";
    } else if (!isValidMobile(form.custMob, mapCountry(form.country))) {
      newErrors.custMob = "Invalid mobile number";
    }
    if (!isRequired(form.country)) newErrors.country = "Country is required";
    if (!isRequired(form.currency)) newErrors.currency = "Currency is required";
    if (!isRequired(form.decimals)) newErrors.decimals = "Decimals is required";
    if (!isRequired(form.customerId)) newErrors.customerId = "Customer ID is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      newErrors.email = "Invalid email";
    }
    if (!form.branchCount || !isNumber(form.branchCount.toString())) {
      newErrors.branchCount = "Branch count must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showToast("Please fill all required fields ❌", "error");
      return;
    }

    setSubmitting(true);

    try {
      await createCompany({
        ...form,
        custMob: formatPhone(form.custMob?.trim() || "", mapCountry(form.country) as CountryCode),
        startDate: new Date().toISOString(),
      });

      showToast("Company created successfully 🎉", "success");

      const regId = form.regId; // preserve regId if needed
      setForm({ ...initialState, startDate: new Date().toISOString() });

    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || err?.message || "Something went wrong";
      showToast(message + " ❌", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* FULL SCREEN LOADER */}
      {submitting && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Loader />
        </div>
      )}

    

      {/* FORM GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <FormInput
          label="Company Name"
          required
          autoFocus
          value={form.custName}
          onChange={(e) => handleChange("custName", e.target.value)}
          error={errors.custName}
          disabled={submitting}
        />

        <FormInput
          label="CR No"
          required
          value={form.crNo}
          onChange={(e) => handleChange("crNo", e.target.value)}
          error={errors.crNo}
          disabled={submitting}
        />

        <FormInput
          label="Mobile No"
          required
          placeholder={
            form.country
              ? mobilePlaceholders[mapCountry(form.country)] ?? "+91 9876543210"
              : "Select country first"
          }
          value={form.custMob}
          onChange={(e) => handleChange("custMob", e.target.value)}
          error={errors.custMob}
          disabled={submitting}
        />

        <FormInput
          label="Email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
          disabled={submitting}
        />

        <FormInput
          label="Tel No"
          value={form.custMob2}
          onChange={(e) => handleChange("custMob2", e.target.value)}
          disabled={submitting}
        />

        <FormInput
          label="Tax Reg No"
          value={form.taxRegNo}
          onChange={(e) => handleChange("taxRegNo", e.target.value)}
          disabled={submitting}
        />

        <SelectInput
          label="Country"
          required
          value={form.country}
          onChange={(e) => handleChange("country", e.target.value)}
          options={[
            { label: "India", value: "India" },
            { label: "UAE", value: "UAE" },
            { label: "Saudi Arabia", value: "Saudi Arabia" },
            { label: "Bahrain", value: "Bahrain" },
            { label: "Oman", value: "Oman" },
            { label: "Qatar", value: "Qatar" },
            { label: "Kuwait", value: "Kuwait" },
            { label: "Singapore", value: "Singapore" },
            { label: "Malaysia", value: "Malaysia" },
            { label: "Thailand", value: "Thailand" },
          ]}
          error={errors.country}
          disabled={submitting}
        />

        <SelectInput
          label="Currency"
          required
          value={form.currency}
          onChange={(e) => handleChange("currency", e.target.value)}
          options={[
            { label: "INR - Indian Rupee", value: "INR" },
            { label: "AED - UAE Dirham", value: "AED" },
            { label: "SAR - Saudi Riyal", value: "SAR" },
            { label: "BHD - Bahraini Dinar", value: "BHD" },
            { label: "OMR - Omani Rial", value: "OMR" },
            { label: "QAR - Qatari Riyal", value: "QAR" },
            { label: "KWD - Kuwaiti Dinar", value: "KWD" },
            { label: "SGD - Singapore Dollar", value: "SGD" },
            { label: "MYR - Malaysian Ringgit", value: "MYR" },
            { label: "THB - Thai Baht", value: "THB" },
          ]}
          error={errors.currency}
          disabled={submitting}
        />

        <FormInput
          label="Block No"
          value={form.block}
          onChange={(e) => handleChange("block", e.target.value)}
          disabled={submitting}
        />

        <FormInput
          label="Decimals"
          required
          value={form.decimals}
          onChange={(e) => handleChange("decimals", e.target.value)}
          error={errors.decimals}
          disabled={submitting}
        />

        <FormInput
          label="Area / Street"
          value={form.area}
          onChange={(e) => handleChange("area", e.target.value)}
          disabled={submitting}
        />

        <FormInput
          label="Customer ID"
          required
          value={form.customerId}
          onChange={(e) => handleChange("customerId", e.target.value)}
          error={errors.customerId}
          disabled={submitting}
        />

        <FormInput
          label="Building No"
          value={form.building}
          onChange={(e) => handleChange("building", e.target.value)}
          disabled={submitting}
        />

        <FormInput
          label="Road No"
          value={form.road}
          onChange={(e) => handleChange("road", e.target.value)}
          disabled={submitting}
        />

        <FormInput
          label="Flat No"
          value={form.flatNo ?? ""}
          onChange={(e) => handleChange("flatNo", e.target.value)}
          disabled={submitting}
          onKeyDown={(e) => {
            if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
              e.preventDefault();
              saveBtnRef.current?.focus();
            }
          }}
        />

      </div>

      {/* BUTTONS */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => setForm({ ...initialState, startDate: new Date().toISOString() })}
          disabled={submitting}
        >
          Clear
        </Button>

        <Button ref={saveBtnRef} onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </>
  );
};

export default CompanyForm;
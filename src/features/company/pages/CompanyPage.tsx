import { useEffect, useRef, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { Building2, Save, RotateCcw } from "lucide-react";
import { Button, FormInput, Loader, PageShell, SelectInput } from "../../../components/common";
import { useToast } from "../../../app/providers/useToast";
import { isRequired, isValidEmail, isValidMobile } from "../../../lib/validators";
import { fetchCompany, updateCompany } from "../services/companyApi";
import type { CompanyFormData, CompanyMasterOption } from "../types";
import { formatPhone } from "../utils/formatters";

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

const emptyForm = (): CompanyFormData => ({
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
  startDate: new Date().toISOString(),
  isDemo: false,
  database: "",
  crNo: "",
  email: "",
  taxRegNo: "",
  currency: "",
  customerId: "",
});

const CompanyPage = () => {
  const { showToast } = useToast();
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  const [form, setForm] = useState<CompanyFormData>(emptyForm);
  const [originalForm, setOriginalForm] = useState<CompanyFormData>(emptyForm);
  const [comId, setComId] = useState<number>(0);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyFormData, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Use fallback currencies — masterload is only for onboarding context
  const currencyMaster: CompanyMasterOption[] = fallbackCurrencies;

  const countryCode = "BH" as CountryCode;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const raw = await fetchCompany() as Record<string, unknown>;
        if (cancelled) return;

        // Map backend fields → CompanyFormData
        const filled: CompanyFormData = {
          ...emptyForm(),
          custName:   String(raw.name    ?? ""),
          custMob:    String(raw.mobNo   ?? ""),
          custMob2:   String(raw.telNo   ?? ""),
          crNo:       String(raw.crNo    ?? ""),
          email:      String(raw.email   ?? ""),
          taxRegNo:   String(raw.taxRegNo ?? ""),
          regId:      String(raw.regId   ?? ""),
          block:      String(raw.block   ?? ""),
          area:       String(raw.area    ?? ""),
          road:       String(raw.road    ?? ""),
          building:   String(raw.building ?? ""),
          flatNo:     String(raw.flatNo  ?? ""),
          // currencyId comes as a number, store as string for SelectInput
          currency:   raw.currencyId ? String(raw.currencyId) : "",
          startDate:  String(raw.createdAt ?? new Date().toISOString()),
        };

        setComId(Number(raw.comId ?? 0));
        setForm(filled);
        setOriginalForm(filled);
      } catch {
        if (!cancelled) {
          showToast("Could not load company data. You can still edit and save.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [showToast]);

  const handleChange = <K extends keyof CompanyFormData>(key: K, value: CompanyFormData[K]) => {
    if (saving) return;
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
    if (form.email && !isValidEmail(form.email)) newErrors.email = "Invalid email";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      await updateCompany({
        ...form,
        custMob: formatPhone(form.custMob.trim(), countryCode),
      }, comId);
      showToast("Company updated successfully", "success");
      setOriginalForm(form);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update company";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(originalForm);
    setErrors({});
  };

  const currencyOptions = currencyMaster.map((item) => ({
    label: item.name,
    value: item.id.toString(),
  }));

  if (loading) {
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
      <div
        className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col"
        style={{ maxHeight: "calc(100vh - 120px)" }}
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput
              label="Registration ID"
              value={form.regId}
              onChange={(e) => handleChange("regId", e.target.value)}
              disabled={saving}
              readOnly
            />

            <FormInput
              label="Company Name"
              required
              value={form.custName}
              onChange={(e) => handleChange("custName", e.target.value)}
              error={errors.custName}
              disabled={saving}
            />

            <FormInput
              label="CR No"
              required
              value={form.crNo}
              onChange={(e) => handleChange("crNo", e.target.value)}
              error={errors.crNo}
              disabled={saving}
            />

            <FormInput
              label="Mobile No"
              required
              placeholder="+973 36001234"
              value={form.custMob}
              onChange={(e) => handleChange("custMob", e.target.value)}
              error={errors.custMob}
              disabled={saving}
            />

            <FormInput
              label="Email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              error={errors.email}
              disabled={saving}
            />

            <FormInput
              label="Tel No"
              value={form.custMob2}
              onChange={(e) => handleChange("custMob2", e.target.value)}
              disabled={saving}
            />

            <FormInput
              label="Tax Reg No"
              value={form.taxRegNo}
              onChange={(e) => handleChange("taxRegNo", e.target.value)}
              disabled={saving}
            />

            <SelectInput
              label="Currency"
              required
              value={form.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              options={currencyOptions}
              error={errors.currency}
              disabled={saving}
            />

            <FormInput
              label="Block No"
              value={form.block}
              onChange={(e) => handleChange("block", e.target.value)}
              disabled={saving}
            />

            <FormInput
              label="Area / Street"
              value={form.area}
              onChange={(e) => handleChange("area", e.target.value)}
              disabled={saving}
            />

            <FormInput
              label="Building No"
              value={form.building}
              onChange={(e) => handleChange("building", e.target.value)}
              disabled={saving}
            />

            <FormInput
              label="Road No"
              value={form.road}
              onChange={(e) => handleChange("road", e.target.value)}
              disabled={saving}
            />

            <FormInput
              label="Flat No"
              value={form.flatNo}
              onChange={(e) => handleChange("flatNo", e.target.value)}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
                  e.preventDefault();
                  saveBtnRef.current?.focus();
                }
              }}
            />
          </div>
        </div>

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 rounded-b-3xl">
          <Button variant="secondary" onClick={handleReset} disabled={saving}>
            <RotateCcw size={16} />
            Reset
          </Button>
          <Button ref={saveBtnRef} onClick={handleSave} disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white" />
                Saving...
              </span>
            ) : (
              <>
                <Save size={16} />
                Update
              </>
            )}
          </Button>
        </div>
      </div>
    </PageShell>
  );
};

export default CompanyPage;

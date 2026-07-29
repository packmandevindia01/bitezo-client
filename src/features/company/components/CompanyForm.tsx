import { useRef } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button, FormInput, Loader, SelectInput } from "../../../components/common";
import { useCompanyOnboardingForm } from "../hooks/useCompanyOnboardingForm";
import type { CompanyFormValues } from "../schemas";
import { useEnterKeyNavigation } from "../../../hooks/useEnterKeyNavigation";

interface CompanyFormProps {
  initialValues?: Partial<CompanyFormValues>;
  lockedFields?: (keyof CompanyFormValues)[];
  submitLabel?: string;
  onSuccess?: () => void;
  clientDb?: string;
  tempToken?: string;
}

const CompanyForm = ({
  initialValues,
  lockedFields = [],
  onSuccess,
  clientDb = "",
  tempToken = "",
}: CompanyFormProps) => {
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  
  const {
    form,
    onSubmit,
    isSubmitting,
    isLoadingMasterData,
    countries,
    currencies,
    resetForm
  } = useCompanyOnboardingForm({
    initialValues,
    clientDb,
    tempToken,
    onSuccess,
  });

  const handleKeyDown = useEnterKeyNavigation();

  const isLocked = (field: keyof CompanyFormValues) => lockedFields.includes(field);

  // Fallback mocks if data is empty (per previous request)
  const countryOptions = countries.length > 0 
    ? countries.map((item) => ({
        label: item.name,
        value: item.id.toString(),
      }))
    : [
        { label: "Bahrain", value: "1" },
        { label: "Saudi Arabia", value: "2" },
        { label: "United Arab Emirates", value: "3" },
        { label: "Kuwait", value: "4" },
        { label: "Oman", value: "5" },
        { label: "Qatar", value: "6" },
      ];

  const currencyOptions = currencies.map((item) => ({
    label: item.currencyName,
    value: item.currencyId.toString(),
  }));

  if (isLoadingMasterData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Controller
          name="regId"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-regId"
              label="Registration ID"
              required
              tabIndex={1}
              autoFocus
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-custName")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("regId")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="custName"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-custName"
              label="Company Name"
              required
              tabIndex={2}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-crNo")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("custName")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="crNo"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-crNo"
              label="CR Number"
              required
              tabIndex={3}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-country")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("crNo")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="country"
          control={form.control}
          render={({ field, fieldState }) => (
            <SelectInput
              id="co-country"
              label="Country"
              required
              tabIndex={4}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-custMob")}
              options={countryOptions}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              className="bg-white"
            />
          )}
        />

        <div className="flex gap-2 w-full">
          <FormInput
            id="co-countryCode"
            label="Code"
            value="+973"
            readOnly
            disabled={isSubmitting}
            wrapperClassName="w-[72px] shrink-0"
            className="bg-slate-50 text-center font-semibold px-2"
            tabIndex={-1}
          />
          <Controller
            name="custMob"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormInput
                id="co-custMob"
                label="Mobile Number"
                required
                tabIndex={5}
                placeholder="36001234"
                {...field}
                onKeyDown={(e) => handleKeyDown(e, "co-email")}
                error={fieldState.error?.message}
                disabled={isSubmitting}
                readOnly={isLocked("custMob")}
                wrapperClassName="flex-1 min-w-0"
                className="bg-white"
              />
            )}
          />
        </div>

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-email"
              label="Email Address"
              tabIndex={6}
              type="email"
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-custMob2")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("email")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="custMob2"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-custMob2"
              label="Landline / Alt Mobile"
              tabIndex={7}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-taxRegNo")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("custMob2")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="taxRegNo"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-taxRegNo"
              label="Tax Registration No"
              tabIndex={8}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-currency")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("taxRegNo")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="currency"
          control={form.control}
          render={({ field, fieldState }) => (
            <SelectInput
              id="co-currency"
              label="Primary Currency"
              required
              tabIndex={9}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-block")}
              options={currencyOptions}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="block"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-block"
              label="Block No"
              tabIndex={10}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-area")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("block")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="area"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-area"
              label="Area / Street"
              tabIndex={11}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-building")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("area")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="building"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-building"
              label="Building"
              tabIndex={12}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-road")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("building")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="road"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-road"
              label="Road No"
              tabIndex={13}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-flatNo")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("road")}
              className="bg-white"
            />
          )}
        />

        <Controller
          name="flatNo"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormInput
              id="co-flatNo"
              label="Flat / Shop No"
              tabIndex={14}
              {...field}
              onKeyDown={(e) => handleKeyDown(e, "co-save-btn")}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              readOnly={isLocked("flatNo")}
              className="bg-white"
            />
          )}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 pt-6">
        <Button 
          variant="secondary" 
          onClick={resetForm} 
          disabled={isSubmitting}
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>

        <Button 
          id="co-save-btn"
          ref={saveBtnRef} 
          onClick={onSubmit} 
          disabled={isSubmitting}
          tabIndex={15}
          isAction
          loading={isSubmitting}
          icon={<Save size={18} />}
        >
          Save
        </Button>
      </div>
    </>
  );
};

export default CompanyForm;

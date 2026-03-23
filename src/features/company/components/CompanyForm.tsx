import { FormInput, Button, SelectInput } from "../../../components/common";

const CompanyForm = () => {
  return (
    <>
      {/* FORM GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-8 gap-y-4 md:gap-y-5">

        <FormInput label="Company Name" required />
        <FormInput label="CR No" required />

        <FormInput label="Mobile No" required />
        <FormInput label="Email" required />

        <FormInput label="Tel No" />
        <FormInput label="Tax Reg No" />

        <SelectInput
          label="Country"
          required
          options={[
            { label: "India", value: "india" },
            { label: "UAE", value: "uae" },
            { label: "Saudi", value: "saudi" },
          ]}
        />

        <FormInput label="Branch Count" required />

        <FormInput label="Block No" />
        <FormInput label="Customer ID" required />

        <FormInput label="Area / Street" />

        <SelectInput
          label="Database"
          required
          options={[
            { label: "MySQL", value: "mysql" },
            { label: "MongoDB", value: "mongo" },
          ]}
        />

        <FormInput label="Building No" />

        <SelectInput
          label="Connection Mode"
          required
          options={[
            { label: "Online", value: "online" },
            { label: "Offline", value: "offline" },
          ]}
        />

        <FormInput label="Road No" />
        <div className="hidden md:block"></div>

        <FormInput label="Flat No" />
        <div className="hidden md:block"></div>

      </div>

      {/* DOCUMENT BUTTON */}
      <div className="mt-6 flex justify-start">
        <Button variant="secondary" size="sm">
          DOCUMENT
        </Button>
      </div>

      {/* FOOTER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8">

        <p className="text-xs sm:text-sm text-gray-600 text-center md:text-left">
          Note: Need to approve
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">

          <Button variant="secondary" className="w-full sm:w-auto">
            Clear
          </Button>

          <Button className="w-full sm:w-auto">
            Save
          </Button>

        </div>

      </div>
    </>
  );
};

export default CompanyForm;
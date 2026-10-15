import FormInput from "../../../../components/common/FormInput";
import SelectInput from "../../../../components/common/SelectInput";

interface Props {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isCreateMode?: boolean;
  registeredBranches?: { branchId: number; name: string }[];
  selectedRegisteredId?: number | null;
  onSelectRegisteredBranch?: (branch: { branchId: number; name: string }) => void;
  loadingRegistered?: boolean;
}

const BranchBasicInfo = ({
  value,
  error,
  disabled,
  onChange,
  onKeyDown,
  isCreateMode = false,
  registeredBranches = [],
  selectedRegisteredId = null,
  onSelectRegisteredBranch,
  loadingRegistered = false,
}: Props) => {
  const registeredOptions = registeredBranches.map((rb, idx) => ({
    value: `${rb.branchId}-${idx}`,
    label: rb.name || `Branch #${rb.branchId}`,
  }));

  const selectedValue = selectedRegisteredId
    ? registeredOptions.find((opt) => opt.value.startsWith(`${selectedRegisteredId}-`))?.value ?? ""
    : "";

  return (
    <div className={`mb-4 ${isCreateMode ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}`}>
      {isCreateMode && (
        <SelectInput
          id="registered-branch-select"
          label="Registered Branch"
          placeholder={
            loadingRegistered
              ? "Loading registered branches..."
              : registeredBranches.length === 0
              ? "No registered branches found"
              : "Select Registered Branch"
          }
          value={selectedValue}
          disabled={disabled || loadingRegistered || registeredBranches.length === 0}
          options={registeredOptions}
          onChange={(e) => {
            const val = e.target.value;
            const match = registeredBranches.find(
              (rb, idx) => `${rb.branchId}-${idx}` === val || String(rb.branchId) === val
            );
            if (match && onSelectRegisteredBranch) {
              onSelectRegisteredBranch(match);
            }
          }}
          autoFocus={isCreateMode}
        />
      )}

      <FormInput
        id="branch-name"
        label="Branch Master"
        name="branchName"
        value={value}
        error={error}
        disabled={disabled}
        required
        autoComplete="off"
        placeholder="Enter branch master"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={!isCreateMode}
      />
    </div>
  );
};

export default BranchBasicInfo;


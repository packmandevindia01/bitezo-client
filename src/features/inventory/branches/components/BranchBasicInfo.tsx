import FormInput from "../../../../components/common/FormInput";
import SelectInput from "../../../../components/common/SelectInput";

interface Props {
  value: string;
  error?: string;
  registeredError?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isCreateMode?: boolean;
  isActive?: boolean;
  registeredBranches?: { branchId: number; name: string }[];
  selectedRegisteredId?: number | null;
  onSelectRegisteredBranch?: (branch: { branchId: number; name: string }) => void;
  loadingRegistered?: boolean;
}

const BranchBasicInfo = ({
  value,
  error,
  registeredError,
  disabled,
  onChange,
  onKeyDown,
  isCreateMode = false,
  isActive = true,
  registeredBranches = [],
  selectedRegisteredId = null,
  onSelectRegisteredBranch,
  loadingRegistered = false,
}: Props) => {
  const registeredOptions = [
    ...(isActive
      ? [{ value: "0", label: "-- Select Registered Branch --" }]
      : [{ value: "0", label: "None / Not Assigned (0)" }]),
    ...registeredBranches.map((rb) => ({
      value: String(rb.branchId),
      label: rb.name ? `${rb.name} (#${rb.branchId})` : `Branch #${rb.branchId}`,
    })),
  ];

  const currentSelectedIdStr = String(selectedRegisteredId ?? 0);
  if (
    selectedRegisteredId &&
    selectedRegisteredId > 0 &&
    !registeredOptions.some((opt) => opt.value === currentSelectedIdStr)
  ) {
    registeredOptions.push({
      value: currentSelectedIdStr,
      label: `Registered Branch #${selectedRegisteredId}`,
    });
  }

  const selectedValue = !isActive ? "0" : currentSelectedIdStr;
  const isSelectDisabled = disabled || !isActive || loadingRegistered;

  return (
    <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <SelectInput
        id="registered-branch-select"
        label="Registered Branch"
        required={isActive}
        error={registeredError}
        placeholder={
          loadingRegistered
            ? "Loading registered branches..."
            : !isActive
            ? "Disabled (Inactive)"
            : registeredBranches.length === 0
            ? "No registered branches found"
            : "Select Registered Branch"
        }
        value={selectedValue}
        disabled={isSelectDisabled}
        options={registeredOptions}
        onChange={(e) => {
          const val = Number(e.target.value) || 0;
          const match = registeredBranches.find((rb) => rb.branchId === val);
          if (onSelectRegisteredBranch) {
            onSelectRegisteredBranch(match || { branchId: val, name: "" });
          }
        }}
        autoFocus={isCreateMode}
      />

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


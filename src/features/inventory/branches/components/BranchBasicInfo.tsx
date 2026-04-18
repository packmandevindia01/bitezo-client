import FormInput from "../../../../components/common/FormInput";

interface Props {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const BranchBasicInfo = ({ value, error, disabled, onChange }: Props) => {
  return (
    <div className="mb-6">
      <p className="font-bold text-sm text-gray-700 mb-3 underline">Basic Information</p>

      <FormInput
        label="Branch Name"
        name="branchName"
        value={value}
        error={error}
        disabled={disabled}
        required
        autoComplete="off"
        placeholder="Enter branch name"
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
    </div>
  );
};

export default BranchBasicInfo;


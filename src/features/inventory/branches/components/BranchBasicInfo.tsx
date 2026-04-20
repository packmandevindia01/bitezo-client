import FormInput from "../../../../components/common/FormInput";

interface Props {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const BranchBasicInfo = ({ value, error, disabled, onChange }: Props) => {
  return (
    <div className="mb-2">

      <FormInput
        label="Branch Master"
        name="branchName"
        value={value}
        error={error}
        disabled={disabled}
        required
        autoComplete="off"
        placeholder="Enter branch master"
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
    </div>
  );
};

export default BranchBasicInfo;


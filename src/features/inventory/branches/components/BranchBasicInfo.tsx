import FormInput from "../../../../components/common/FormInput";

interface Props {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const BranchBasicInfo = ({ value, error, disabled, onChange, onKeyDown }: Props) => {
  return (
    <div className="mb-2">

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
        autoFocus
      />
    </div>
  );
};

export default BranchBasicInfo;


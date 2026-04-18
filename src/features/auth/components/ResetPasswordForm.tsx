import { useState } from "react";
import { FormInput, Button } from "../../../components/common";

interface Props {
  onSubmit: (password: string) => void;
}

const ResetPasswordForm = ({ onSubmit }: Props) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!password || !confirm) {
      setError("All fields are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    onSubmit(password);
  };

  return (
    <div className="flex flex-col gap-4">

      <FormInput
        label="New Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
      />

      <FormInput
        label="Confirm Password"
        type="password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={error}
      />

      <Button onClick={handleSubmit} className="w-full">
        Reset Password
      </Button>

    </div>
  );
};

export default ResetPasswordForm;
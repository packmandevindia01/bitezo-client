import { useState } from "react";
import { FormInput, Button, Checkbox } from "../../../components/common";

const UserForm = () => {
  const [active, setActive] = useState(false);
  const [isMaster, setIsMaster] = useState(false);

  return (
    <>
      {/* FORM */}
      <div className="flex flex-col gap-4 md:gap-5 max-w-lg mx-auto">

        <FormInput label="User Name" required />
        <FormInput label="Password" type="password" required />
        <FormInput label="Confirm Pwd" type="password" required />
        <FormInput label="Branch Name" required />
        <FormInput label="Email ID" required />

        {/* CHECKBOXES */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-8 mt-2">

          <Checkbox
            label="Active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />

          <Checkbox
            label="Is Master"
            checked={isMaster}
            onChange={(e) => setIsMaster(e.target.checked)}
          />

        </div>

      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-8">

        <Button variant="secondary" className="w-full sm:w-auto">
          Clear
        </Button>

        <Button className="w-full sm:w-auto">
          Save
        </Button>

        <Button variant="danger" className="w-full sm:w-auto">
          Delete
        </Button>

      </div>
    </>
  );
};

export default UserForm;
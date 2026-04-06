import { useNavigate } from "react-router-dom";
import { Button } from "../../../../components/common";
import CustomerForm from "../components/CustomerForm";

const CustomerFormPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="mx-auto mb-4 flex w-full max-w-6xl justify-start">
        <Button variant="secondary" onClick={() => navigate("/dashboard/customers")}>
          Back to Customers
        </Button>
      </div>

      <div className="mx-auto w-full max-w-6xl rounded-xl bg-white p-5 shadow-md sm:p-6 md:p-8">
        <h1 className="mb-6 text-center text-xl font-bold sm:text-2xl md:mb-8">
          CUSTOMER REGISTRATION
        </h1>

        <CustomerForm />
      </div>
    </div>
  );
};

export default CustomerFormPage;


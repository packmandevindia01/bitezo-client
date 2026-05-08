import { useNavigate } from "react-router-dom";
import CashierSessionPage from "../components/CashierSessionPage";

const CashierOutPage = () => {
  const navigate = useNavigate();

  return (
    <CashierSessionPage
      onSessionReady={() => navigate("/pos")}
      onSkip={() => navigate("/pos")}
    />
  );
};

export default CashierOutPage;
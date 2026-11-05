import { useEnterToNextField } from "../../hooks/useEnterToNextField";

/** Back Office only: Enter moves to the next input field on every /dashboard screen. Renders nothing. */
const BackofficeEnterNavigation = () => {
  useEnterToNextField(true);
  return null;
};

export default BackofficeEnterNavigation;

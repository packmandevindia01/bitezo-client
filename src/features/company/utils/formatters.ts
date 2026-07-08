import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import type { CountryCode } from "libphonenumber-js/min";

export const formatPhone = (
  value: string,
  country: CountryCode
): string => {
  if (!value || !value.trim()) return "-";

  const phone = parsePhoneNumberFromString(value.trim(), country);

  return phone?.isValid() ? phone.number : value.trim();
};
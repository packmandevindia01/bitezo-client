import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

export const formatPhone = (
  value: string,
  country: CountryCode
): string => {
  if (!value || !value.trim()) return "-";

  const phone = parsePhoneNumberFromString(value.trim(), country);

  return phone?.isValid() ? phone.number : value.trim();
};
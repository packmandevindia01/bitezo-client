import type { CountryCode } from "libphonenumber-js";

export const mapCountry = (country: string): CountryCode => {
  const c = country.toLowerCase();

  // 🇮🇳 INDIA
  if (c.includes("india")) return "IN";

  // 🇦🇪 UAE
  if (c.includes("uae") || c.includes("united arab emirates")) return "AE";

  // 🇸🇦 SAUDI
  if (c.includes("saudi")) return "SA";

  // 🇧🇭 BAHRAIN
  if (c.includes("bahrain")) return "BH";

  // 🇴🇲 OMAN
  if (c.includes("oman")) return "OM";

  // 🇶🇦 QATAR
  if (c.includes("qatar")) return "QA";

  // 🇰🇼 KUWAIT
  if (c.includes("kuwait")) return "KW";

  // 🇸🇬 SINGAPORE
  if (c.includes("singapore")) return "SG";

  // 🇲🇾 MALAYSIA
  if (c.includes("malaysia")) return "MY";

  // 🇹🇭 THAILAND
  if (c.includes("thailand")) return "TH";

  // 🇮🇩 INDONESIA
  if (c.includes("indonesia")) return "ID";

  // 🇵🇭 PHILIPPINES
  if (c.includes("philippines")) return "PH";

  // 🇨🇳 CHINA
  if (c.includes("china")) return "CN";

  // 🇯🇵 JAPAN
  if (c.includes("japan")) return "JP";

  // 🇰🇷 SOUTH KOREA
  if (c.includes("korea")) return "KR";

  return "IN"; // ✅ fallback
};
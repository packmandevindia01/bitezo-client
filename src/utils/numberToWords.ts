const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

function convertGroup(n: number): string {
  let str = "";
  if (n > 99) {
    str += ones[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n > 19) {
    str += tens[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ones[n] + " ";
  }
  return str.trim();
}

function toWords(n: number): string {
  if (n === 0) return "Zero";
  let str = "";
  let scaleIdx = 0;

  while (n > 0) {
    const group = n % 1000;
    if (group > 0) {
      const groupStr = convertGroup(group);
      str = groupStr + " " + scales[scaleIdx] + " " + str;
    }
    n = Math.floor(n / 1000);
    scaleIdx++;
  }

  return str.trim();
}

/**
 * Converts a decimal number to words with currency units.
 * @param value The numeric value
 * @param currencyName The name of the primary currency (e.g., "BAHRINI DINAR")
 * @param subunitName The name of the fractional currency (e.g., "FILS")
 * @param decimalPlaces The number of decimal places to extract (e.g., 3 for FILS)
 */
export function numberToWords(
  value: number,
  currencyName = "BAHRINI DINAR",
  subunitName = "FILS",
  decimalPlaces = 3
): string {
  if (!value || isNaN(value)) return `Zero ${currencyName} Only`;

  // Handle rounding correctly to avoid floating point issues
  const multiplier = Math.pow(10, decimalPlaces);
  const totalSubunits = Math.round(value * multiplier);
  
  const integerPart = Math.floor(totalSubunits / multiplier);
  const fractionalPart = totalSubunits % multiplier;

  const intWords = toWords(integerPart);
  
  if (fractionalPart === 0) {
    return `${intWords} ${currencyName} Only`;
  }

  const fracWords = toWords(fractionalPart);
  
  // If there's no integer part, just return the subunit words
  if (integerPart === 0) {
    return `${fracWords} ${subunitName} Only`;
  }

  return `${intWords} ${currencyName} and ${fracWords} ${subunitName} Only`;
}

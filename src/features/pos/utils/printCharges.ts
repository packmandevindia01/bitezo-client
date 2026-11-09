import { getBillingConfig, roundCalc } from "../terminal/utils/billing";

export interface PrintChargeLine {
  label: string;
  arabic: string;
  amount: number;
}

interface PrintChargeInput {
  /** The charges total the bill adds up with. The lines always sum to exactly this. */
  total: number;
  serviceCharge: number;
  levy: number;
  /** Sub Total − Discount (exclusive): what the service charge is worked out on. */
  netBase: number;
  orderType?: string;
  decimals: number;
}

/**
 * The configured rate when it explains the amount (exact "10%" even on small bills where rounding drifts),
 * else the rate the amount really is: a saved order can carry an older rate than today's setting.
 */
const percentOf = (amount: number, base: number, configured: number, fil: number): number | null => {
  if (base <= 0) return null;
  if (configured > 0 && Math.abs((base * configured) / 100 - amount) <= 2 * fil) return roundCalc(configured, 2);
  return roundCalc((amount / base) * 100, 2);
};

const withPercent = (name: string, percent: number | null) => (percent === null ? name : `${name} (${percent}%)`);

/**
 * Bill footer lines for the charges: Service Charge, then Levy, each with its percentage.
 * A saved order can come back with a missing or stale levy while the bill total is right; the configured rates are
 * tried then. If nothing explains the total it stays one "Charges" line, so the bill still adds up.
 * Display only: stored and charged amounts are not touched.
 */
export const printChargeLines = ({ total, serviceCharge: givenSc, levy: givenLevy, netBase, orderType, decimals }: PrintChargeInput): PrintChargeLine[] => {
  if (total <= 0) return [];
  const fil = 10 ** -decimals;
  const tolerance = Math.max(0.005, 2 * fil);
  const config = getBillingConfig(orderType ?? "");
  const explains = (sc: number, l: number) => sc + l > 0 && Math.abs(sc + l - total) <= tolerance;

  let serviceCharge = givenSc;
  let levy = givenLevy;
  if (!explains(serviceCharge, levy)) {
    serviceCharge = /dine/i.test(orderType ?? "") ? netBase * config.serviceChargeRate : 0;
    levy = (netBase + serviceCharge) * config.levyRate;
    if (!explains(serviceCharge, levy)) return [{ label: "Charges", arabic: "الرسوم", amount: total }];
  }

  const shownLevy = levy > 0 ? (serviceCharge > 0 ? roundCalc(levy, decimals) : total) : 0;
  const shownServiceCharge = roundCalc(total - shownLevy, decimals);
  const lines: PrintChargeLine[] = [];
  if (shownServiceCharge > 0) {
    lines.push({ label: withPercent("Service Charge", percentOf(serviceCharge, netBase, config.serviceChargeRate * 100, fil)), arabic: "رسوم الخدمة", amount: shownServiceCharge });
  }
  if (shownLevy > 0) {
    const levyBase = netBase > 0 ? netBase + serviceCharge : 0;
    lines.push({ label: withPercent("Levy", percentOf(levy, levyBase, config.levyRate * 100, fil)), arabic: "الضريبة الإضافية", amount: shownLevy });
  }
  return lines;
};

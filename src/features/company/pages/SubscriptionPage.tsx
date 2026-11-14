import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, AlertTriangle, AlertCircle, CalendarPlus, CalendarX2, CalendarRange, Hourglass, RefreshCw, Mail, Info,
} from "lucide-react";
import { PageShell } from "../../../components/common";
import { fetchSubscriptionData } from "../services/companyApi";
import { summarizeSubscription, type SubscriptionState } from "../utils/subscriptionSummary";

// Help → Subscription (2026-11-14): GET /company/subscription-data.
const SUPPORT_EMAIL = "packmancarebh@gmail.com";

const STATE_STYLE: Record<SubscriptionState, {
  label: string; message: string; icon: ReactNode; hero: string; ring: string; chip: string; bar: string;
}> = {
  active: {
    label: "Active",
    message: "Your subscription is active. Enjoy uninterrupted service.",
    icon: <ShieldCheck size={18} />,
    hero: "from-[#49293e] via-[#5d3550] to-[#2f1a28]",
    ring: "#34d399",
    chip: "bg-emerald-400/20 text-emerald-100 ring-emerald-300/40",
    bar: "bg-emerald-500",
  },
  expiring: {
    label: "Expiring soon",
    message: "Your subscription ends soon. Please renew to avoid service interruption.",
    icon: <AlertTriangle size={18} />,
    hero: "from-[#49293e] via-[#6b3a4f] to-[#7c3a2a]",
    ring: "#fbbf24",
    chip: "bg-amber-400/20 text-amber-100 ring-amber-300/40",
    bar: "bg-amber-500",
  },
  expired: {
    label: "Expired",
    message: "Your subscription has expired. Please renew immediately.",
    icon: <AlertCircle size={18} />,
    hero: "from-[#4a1d2b] via-[#7f1d3a] to-[#9f1239]",
    ring: "#fb7185",
    chip: "bg-rose-400/20 text-rose-100 ring-rose-300/40",
    bar: "bg-rose-500",
  },
};

const DaysRing = ({ daysLeft, percent, color }: { daysLeft: number; percent: number; color: string }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * percent) / 100}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span id="sub-days-left" className="text-3xl font-bold leading-none sm:text-4xl">{daysLeft}</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/70">{daysLeft === 1 ? "day left" : "days left"}</span>
      </div>
    </div>
  );
};

const InfoCard = ({ id, icon, label, value, hint }: { id: string; icon: ReactNode; label: string; value: string; hint?: string }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#49293e]/10 text-[#49293e]">{icon}</span>
    <span className="flex min-w-0 flex-col">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <span id={id} className="truncate text-base font-bold text-gray-800 sm:text-lg">{value}</span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </span>
  </div>
);

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["companySubscriptionData"],
    queryFn: fetchSubscriptionData,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const body = (() => {
    if (isLoading) {
      return (
        <div data-testid="sub-loading" className="flex flex-col gap-4">
          <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200" />)}
          </div>
        </div>
      );
    }
    if (isError || !data) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500"><AlertCircle size={26} /></span>
          <div>
            <p className="font-semibold text-gray-800">{isError ? "Could not load the subscription details" : "No subscription details found"}</p>
            <p className="text-sm text-gray-500">Please try again in a moment.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#49293e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3a2031]"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} /> Try again
          </button>
        </div>
      );
    }

    const s = summarizeSubscription(data);
    const style = STATE_STYLE[s.state];
    const usedPercent = s.totalDays ? (s.usedDays / s.totalDays) * 100 : 0;

    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Status */}
        <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${style.hero} p-5 text-white shadow-lg sm:px-7 sm:py-5`}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
          <div className="relative flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
            <div className="flex min-w-0 flex-col items-center gap-2 md:items-start">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span id="sub-status" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${style.chip}`}>
                  {style.icon} {style.label}
                </span>
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  title="Refresh"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90 ring-1 ring-white/25 transition hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                {s.expiryLabel ? (s.state === "expired" ? `Expired on ${s.expiryLabel}` : `Valid until ${s.expiryLabel}`) : "Subscription details"}
              </h1>
              <p className="max-w-md text-sm text-white/75">{style.message}</p>
            </div>
            <DaysRing daysLeft={s.daysLeft} percent={s.percentLeft} color={style.ring} />
          </div>
        </section>

        {/* Dates */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard id="sub-start" icon={<CalendarPlus size={22} />} label="Start date" value={s.startLabel || "—"} />
          <InfoCard id="sub-expiry" icon={<CalendarX2 size={22} />} label="Expiry date" value={s.expiryLabel || "—"} />
          <InfoCard id="sub-period" icon={<CalendarRange size={22} />} label="Plan period" value={s.totalDays ? `${s.totalDays} days` : "—"} />
          <InfoCard id="sub-remaining" icon={<Hourglass size={22} />} label="Days remaining" value={`${s.daysLeft} ${s.daysLeft === 1 ? "day" : "days"}`} />
        </section>

        {/* Timeline */}
        {s.totalDays > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#49293e]">Usage timeline</h2>
              <span className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{s.usedDays}</span> of {s.totalDays} days used
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${style.bar} transition-[width] duration-700 ease-out`} style={{ width: `${usedPercent}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between gap-2 text-xs text-gray-400">
              <span>{s.startLabel}</span>
              <span>{s.expiryLabel}</span>
            </div>
          </section>
        )}

        {/* Renew */}
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-[#49293e]/10 bg-[#49293e]/5 p-4 text-center sm:flex-row sm:px-5 sm:text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#49293e] shadow-sm"><Mail size={20} /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="font-semibold text-gray-800">Renew or upgrade</p>
            <p className="text-sm text-gray-500">Contact Packman Solutions to renew your subscription.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Subscription%20renewal`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#49293e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a2031] active:scale-[0.98]"
            >
              <Mail size={16} /> Contact to renew
            </a>
            <button
              onClick={() => navigate("/dashboard/about-us")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#49293e]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#49293e] transition hover:bg-[#49293e]/5"
            >
              <Info size={16} /> About Us
            </button>
          </div>
        </section>
      </div>
    );
  })();

  return (
    <PageShell title="Subscription">
      <div className="mx-auto flex w-full max-w-5xl flex-col p-3 sm:px-6 sm:py-4">
        {body}
      </div>
    </PageShell>
  );
};

export default SubscriptionPage;

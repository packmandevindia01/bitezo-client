import type { ReactNode } from "react";
import { Building2, Globe, Mail, Phone, BadgeCheck, Headphones, ExternalLink } from "lucide-react";
import { PageShell } from "../../../../components/common";

// Help → About Us (2026-11-14). Company details; change them here.
const ABOUT_US = {
  company: "Packman Solutions",
  version: "V1",
  website: "www.packmansolutions.com",
  email: "packmancarebh@gmail.com",
  phones: ["+973 34655651", "+973 17404567"],
};

interface ContactCardProps {
  id: string;
  icon: ReactNode;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

const ContactCard = ({ id, icon, label, value, href, external }: ContactCardProps) => (
  <a
    id={id}
    href={href}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    className="group flex min-w-0 items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#49293e]/20 hover:shadow-md sm:p-5"
  >
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#49293e]/10 text-[#49293e] transition-colors group-hover:bg-[#49293e] group-hover:text-white">
      {icon}
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <span className="break-all text-sm font-semibold text-gray-800 sm:text-base">{value}</span>
    </span>
    <ExternalLink size={16} className="shrink-0 text-gray-300 transition-colors group-hover:text-[#49293e]" />
  </a>
);

const AboutUsPage = () => (
  <PageShell title="About Us">
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-3 sm:p-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#49293e] via-[#5d3550] to-[#2f1a28] p-6 text-white shadow-lg sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm sm:h-24 sm:w-24">
            <Building2 size={40} />
          </span>
          <div className="flex min-w-0 flex-col items-center gap-2 sm:items-start">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">About Us</span>
            <h1 className="text-2xl font-bold sm:text-4xl">{ABOUT_US.company}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
              <BadgeCheck size={15} />
              Version {ABOUT_US.version}
            </span>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-[#49293e]">Get in touch</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ContactCard id="about-website" icon={<Globe size={22} />} label="Website" value={ABOUT_US.website} href={`https://${ABOUT_US.website}`} external />
          <ContactCard id="about-email" icon={<Mail size={22} />} label="Email" value={ABOUT_US.email} href={`mailto:${ABOUT_US.email}`} />
          {ABOUT_US.phones.map((phone, i) => (
            <ContactCard
              key={phone}
              id={`about-phone-${i + 1}`}
              icon={<Phone size={22} />}
              label={`Phone ${i + 1}`}
              value={phone}
              href={`tel:${phone.replace(/\s/g, "")}`}
            />
          ))}
        </div>
      </section>

      {/* Support */}
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-[#49293e]/10 bg-[#49293e]/5 p-5 text-center sm:flex-row sm:p-6 sm:text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#49293e] shadow-sm">
          <Headphones size={22} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-semibold text-gray-800">Need help?</p>
          <p className="text-sm text-gray-500">Contact our support team by email or phone and we will get back to you.</p>
        </div>
        <a
          href={`mailto:${ABOUT_US.email}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#49293e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a2031] active:scale-[0.98]"
        >
          <Mail size={16} />
          Email support
        </a>
      </section>

      <p className="pb-2 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {ABOUT_US.company}. All rights reserved.
      </p>
    </div>
  </PageShell>
);

export default AboutUsPage;

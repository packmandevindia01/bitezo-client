import { Settings2, Monitor } from "lucide-react";

const RegistrationSidebar = () => {
  return (
    <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#49293e] via-[#5c3450] to-[#7b556c] p-6 text-white shadow-lg sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
        Device Setup
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight">
        Register This System
      </h1>
      <p className="mt-4 text-sm leading-6 text-white/80">
        Each machine must be registered before it can be used. This tells
        the system whether this is a cashier POS terminal or a management
        workstation.
      </p>

      <div className="mt-8 space-y-4">
        {[
          {
            Icon: Settings2,
            title: "One-time setup",
            desc: "Register once — the setting is stored on this device.",
          },
          {
            Icon: Monitor,
            title: "POS or Back Office",
            desc: "POS requires a cashier to open a shift. Back Office goes straight to the dashboard.",
          },
        ].map(({ Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-white/75">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RegistrationSidebar;

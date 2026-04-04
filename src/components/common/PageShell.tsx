interface PageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const PageShell = ({ title, description, children }: PageShellProps) => {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-[#49293e] to-[#6d4259] px-4 py-6 text-white shadow-lg sm:px-6 md:px-8 md:py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
            POS Master Setup
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-wide sm:text-2xl md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 md:text-base">{description}</p>
        </section>

        {children}
      </div>
    </div>
  );
};

export default PageShell;

interface PageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const PageShell = ({ children }: PageShellProps) => {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default PageShell;

/**
 * SectionHeader - Consistent section headers with title and optional subtitle
 * Ensures visual hierarchy and consistent spacing
 */
export function SectionHeader({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`mb-8 ${className}`}>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
        {title}
      </h1>
      {subtitle && (
        <p className="text-lg text-slate-600 max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}


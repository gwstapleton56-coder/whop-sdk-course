/**
 * Card - Premium card component with consistent styling
 * Used for content sections, feature cards, and interactive elements
 */
export function Card({
  children,
  className = "",
  hover = false,
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const baseClasses = "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const hoverClasses = hover || interactive
    ? "transition-all duration-200 hover:shadow-md hover:border-slate-300"
    : "";
  const interactiveClasses = interactive
    ? "cursor-pointer"
    : "";

  const Component = onClick ? "button" : "div";
  const combinedClasses = `${baseClasses} ${hoverClasses} ${interactiveClasses} ${className}`.trim();

  return (
    <Component
      className={combinedClasses}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      {children}
    </Component>
  );
}


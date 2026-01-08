/**
 * Skeleton - Loading placeholder component
 * Used for loading states to show content structure
 */
export function Skeleton({
  className = "",
  variant = "text",
}: {
  className?: string;
  variant?: "text" | "card" | "circle";
}) {
  const baseClasses = "animate-pulse bg-slate-200 rounded";
  
  if (variant === "card") {
    return <div className={`${baseClasses} h-32 ${className}`} />;
  }
  
  if (variant === "circle") {
    return <div className={`${baseClasses} rounded-full ${className}`} />;
  }
  
  return <div className={`${baseClasses} h-4 ${className}`} />;
}



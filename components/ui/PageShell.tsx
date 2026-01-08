/**
 * PageShell - Consistent page container with max-width and padding
 * Used across all main content pages for consistent spacing
 */
export function PageShell({ 
  children, 
  className = "",
  maxWidth = "max-w-5xl"
}: { 
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div className={`mx-auto w-full ${maxWidth} px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {children}
    </div>
  );
}



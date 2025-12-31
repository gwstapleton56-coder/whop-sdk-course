/**
 * Input - Consistent input component with premium styling
 * Used for text inputs and textareas throughout the app
 */
export function Input({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  rows,
  className = "",
  disabled = false,
  autoFocus = false,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  type?: "text" | "email" | "password";
  rows?: number;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const baseClasses = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50";
  
  const Component = rows ? "textarea" : "input";
  const inputProps = rows
    ? { rows, onChange }
    : { type, onChange, autoFocus };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-900 mb-2">
          {label}
        </label>
      )}
      <Component
        {...inputProps}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className={baseClasses}
      />
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}


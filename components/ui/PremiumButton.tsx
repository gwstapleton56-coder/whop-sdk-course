/**
 * PremiumButton - Enhanced button component for Pro/Upgrade CTAs
 * Creates a premium, trustworthy feel for subscription actions
 */
"use client";

import { Button } from "@whop/react/components";

export function PremiumButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "3",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
  size?: "2" | "3" | "4";
  className?: string;
}) {
  if (variant === "secondary") {
    return (
      <Button
        variant="soft"
        size={size}
        onClick={onClick}
        disabled={disabled || loading}
        loading={loading}
        className={`rounded-xl font-semibold transition-all duration-200 ${className}`}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      variant="classic"
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      loading={loading}
      className={`rounded-xl font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 ${className}`}
    >
      {children}
    </Button>
  );
}



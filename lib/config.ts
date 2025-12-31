// Hardened config - always available even if env vars fail to load
export const PRO_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_PRO_CHECKOUT_URL ??
  "https://whop.com/checkout/plan_vUJgdmLT1NahC";

export const PRO_PLAN_ID =
  process.env.PRO_PLAN_ID ??
  "plan_vUJgdmLT1NahC";

// Pro product ID for access checks
export const PRO_PRODUCT_ID =
  process.env.PRO_PRODUCT_ID ??
  "prod_36tkHQYfHNjdS";



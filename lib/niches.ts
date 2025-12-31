// Always-on Custom niche (enforced in code)
// We do not store "CUSTOM" as a preset row.
// Instead, we inject it at runtime so it can never disappear:

export const ALWAYS_CUSTOM_PRESET = {
  key: "custom",
  label: "Custom",
  aiContext: "Adapt to the user-provided niche and keep examples aligned." as string | null,
  isEnabled: true,
  sortOrder: 999999,
};




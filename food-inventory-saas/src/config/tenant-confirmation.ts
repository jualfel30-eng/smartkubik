export const isTenantConfirmationEnforced = (): boolean => {
  const envValue = process.env.ENFORCE_TENANT_CONFIRMATION ?? '';
  return typeof envValue === 'string' && envValue.toLowerCase() === 'true';
};

export const shouldBypassTenantConfirmation = (): boolean => {
  return !isTenantConfirmationEnforced() || process.env.NODE_ENV !== 'production';
};

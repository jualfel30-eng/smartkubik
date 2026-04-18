/**
 * Shared navigation utility functions.
 * Used by both the desktop sidebar (App.jsx) and mobile MobileMoreMenu.
 */

/**
 * Determines whether a navigation item should be visible based on
 * permissions, modules, vertical, profile, feature flags, and whitelist.
 *
 * Mirrors the filtering logic previously inline in App.jsx renderMenuItem.
 */
export function isNavItemVisible(item, {
  tenant,
  hasPermission,
  memberships = [],
  isFeatureEnabled,
  sidebarWhitelist,
  restaurantModuleEnabled,
  level = 0,
}) {
  // 1. Niche profile sidebar whitelist — only affects top-level items
  if (level === 0 && sidebarWhitelist && !sidebarWhitelist.has(item.href)) {
    return false;
  }

  // 2. Module check
  if (item.requiresModule) {
    if (item.requiresModule === 'restaurant' && !restaurantModuleEnabled) {
      return false;
    }
    if (
      item.requiresModule !== 'restaurant' &&
      !tenant?.enabledModules?.[item.requiresModule]
    ) {
      return false;
    }
  }

  // 3. Vertical check
  if (item.requiresVertical && !item.requiresVertical.includes(tenant?.vertical)) {
    return false;
  }

  // 4. Profile key check
  if (item.requiresProfileKey && tenant?.verticalProfile?.key !== item.requiresProfileKey) {
    return false;
  }

  // 5. Subsidiaries check
  if (item.requiresSubsidiaries) {
    const isParent = memberships.some(
      (m) => m.tenant?.parentTenantId && m.tenant.parentTenantId === (tenant?._id || tenant?.id)
    );
    if (!isParent && !tenant?.isSubsidiary) {
      return false;
    }
  }

  // 6. Feature flag check
  if (item.requiresFeatureFlag && !isFeatureEnabled(item.requiresFeatureFlag)) {
    return false;
  }

  // 7. Permission check
  if (item.permission && !hasPermission(item.permission)) {
    return false;
  }

  return true;
}

/**
 * Returns the display name for a nav item, applying dynamic label
 * overrides based on the tenant's vertical profile.
 */
export function getDisplayName(item, profileKey, tipsLabels) {
  if (item.dynamicLabel && item.name === 'tips') {
    return tipsLabels?.plural || item.name;
  }

  if (item.dynamicLabel && item.name === 'Citas') {
    const citasLabels = {
      'barbershop-salon': 'Agenda',
      'clinic-spa': 'Consultas',
      'mechanic-shop': 'Citas de Servicio',
      'hospitality': 'Reservaciones',
    };
    return citasLabels[profileKey] || item.name;
  }

  if (item.dynamicLabel && item.name === 'Recursos') {
    const recursosLabels = {
      'barbershop-salon': 'Profesionales',
      'clinic-spa': 'Profesionales',
      'mechanic-shop': 'Bahías / Equipos',
      'hospitality': 'Habitaciones',
    };
    return recursosLabels[profileKey] || item.name;
  }

  return item.name;
}

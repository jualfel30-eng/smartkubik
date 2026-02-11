import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  fetchApi,
  switchTenant as switchTenantApi,
} from '../lib/api';
import { isFeatureEnabled } from '../config/features';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  TENANT: 'tenant',
  MEMBERSHIPS: 'memberships',
  ACTIVE_MEMBERSHIP: 'activeMembershipId',
  LAST_LOCATION: 'lastLocation',
};

function normalizeTenant(rawTenant) {
  if (!rawTenant) return null;
  const aiAssistant = rawTenant.aiAssistant || {};
  const isExplicitlyUnconfirmed =
    rawTenant?.isConfirmed === false || rawTenant?.tenantConfirmed === false;
  return {
    id: rawTenant.id || rawTenant._id,
    code: rawTenant.code,
    name: rawTenant.name,
    businessType: rawTenant.businessType,
    vertical: rawTenant.vertical,
    enabledModules: rawTenant.enabledModules,
    subscriptionPlan: rawTenant.subscriptionPlan,
    isConfirmed: !isExplicitlyUnconfirmed,
    verticalProfile: {
      key: rawTenant.verticalProfile?.key || 'food-service',
      overrides: rawTenant.verticalProfile?.overrides || {},
    },
    currency: rawTenant.settings?.currency?.primary || 'USD',
    aiAssistant: {
      autoReplyEnabled: Boolean(aiAssistant.autoReplyEnabled),
      knowledgeBaseTenantId: aiAssistant.knowledgeBaseTenantId || '',
      model: aiAssistant.model || 'gpt-4o-mini',
      capabilities: {
        knowledgeBaseEnabled:
          aiAssistant.capabilities?.knowledgeBaseEnabled !== false,
        inventoryLookup: Boolean(aiAssistant.capabilities?.inventoryLookup),
        schedulingLookup: Boolean(aiAssistant.capabilities?.schedulingLookup),
        orderLookup: Boolean(aiAssistant.capabilities?.orderLookup),
      },
    },
  };
}

export const AuthProvider = ({ children }) => {
  const multiTenantEnabled = isFeatureEnabled('MULTI_TENANT_LOGIN');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (!stored || stored === 'undefined') return null;
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      return null;
    }
  });
  const [tenant, setTenant] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.TENANT);
    const storedActiveMembership = localStorage.getItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);

    if (!stored || stored === 'undefined') return null;

    // En modo multi-tenant: solo cargar tenant si hay activeMembershipId
    if (multiTenantEnabled && !storedActiveMembership) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored);
      return normalizeTenant(parsed);
    } catch (error) {
      console.error('Failed to parse stored tenant:', error);
      return null;
    }
  });
  const [memberships, setMemberships] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
    if (!stored || stored === 'undefined') return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse stored memberships:', error);
      return [];
    }
  });
  const [activeMembershipId, setActiveMembershipId] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP) || null;
  });
  const [token, setToken] = useState(
    localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  );
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);

  const resetState = () => {
    setToken(null);
    setUser(null);
    setTenant(null);
    setMemberships([]);
    setActiveMembershipId(null);
    setIsAuthenticated(false);
  };

  const clearStoredSession = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TENANT);
    localStorage.removeItem(STORAGE_KEYS.MEMBERSHIPS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);
    resetState();
  };

  // Este useEffect ya no es necesario para la inicialización,
  // porque ahora se hace en el useState inicial.
  // Lo mantenemos vacío para evitar warnings de dependencias.
  // Refresh session on mount validation
  const refreshSession = async () => {
    try {
      if (!token) return;

      const response = await fetchApi('/auth/profile');

      // Update User
      setUser(response);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response));

      // Refresh Memberships from dedicated endpoint
      try {
        const membershipsResponse = await fetchApi('/auth/memberships');
        if (membershipsResponse && membershipsResponse.success && Array.isArray(membershipsResponse.data)) {
          setMemberships(membershipsResponse.data);
          localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(membershipsResponse.data));
          console.log('Memberships refreshed:', membershipsResponse.data);
        }
      } catch (memError) {
        console.error('Failed to refresh memberships:', memError);
      }

      // Old logic commented out
      /*
      // Note: If /auth/me doesn't return memberships, we rely on the implementation below.
      // Ideally, the backend /auth/me should return everything or we call a dedicated endpoint.
      // Based on login logic, memberships come with login. Let's try to get them.
      
      // If /auth/me only returns user, we might be missing memberships updates.
      // However, usually detailed session info includes it. 
      // Let's assume for now we need to trigger a token refresh flow or similar if /auth/me is limited.
      // But looking at login response, it seems robust.
      // For now, let's trust that if we have a token, we can at least validate the user.
      
      // CRITICAL: The issue is memberships are stale.
      // If /auth/me doesn't return memberships, we might need /users/me/memberships.
      // Let's check if we can assume response has it or if we need to fetch organizations.
      // Actually, fetching organizations list might be safer to sync memberships.
      
      const orgsResponse = await fetchApi('/organizations');
      // If orgsResponse is the list of organizations, we can map them to memberships structure if needed,
      // OR we just rely on the fact that OrganizationSelector fetches /organizations itself?
      // Wait, OrganizationSelector uses `memberships` from useAuth.
      // And `memberships` are set in `useAuth` from `localStorage`.
      
      // We need to update `memberships` state.
      // Let's fetch /users/me/tenants or /auth/refresh if available.
      // Since we don't know the exact endpoint for memberships, let's try to infer from typical structure
      // or just assume /auth/me might have it.
      
      if (response.memberships) {
        setMemberships(response.memberships);
        localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(response.memberships));
      } else {
        // Fallback: if /auth/me didn't return memberships, we must force a reload?
        // Let's actually use the loginWithTokens logic if we had a refresh token endpoint.
        // But we don't.
      
        // Let's try to fetch /organizations and rebuild memberships if the backend supports it.
        // But memberships have roles, etc. Simple /organizations might not be enough.
      
        // Strategy: Force a deeper refresh if possible.
        // For now, let's just make sure we at least try to update user.
        console.log('Session refreshed', response);
      }
            */

    } catch (error) {
      console.error('Failed to refresh session:', error);
      // If 401, logout
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        logout();
      }
    }
  };

  useEffect(() => {
    // Inicialización ahora en useState
    if (token) {
      refreshSession();
    }
  }, [token]);

  const login = async (email, password, tenantCode) => {
    try {
      const response = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, tenantCode }),
      });

      const {
        accessToken,
        refreshToken,
        user: userData,
        tenant: tenantData,
        memberships: membershipsData,
      } = response.data;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);

      if (multiTenantEnabled && Array.isArray(membershipsData)) {
        const sanitizedMemberships = membershipsData.filter(Boolean);
        setMemberships(sanitizedMemberships);
        localStorage.setItem(
          STORAGE_KEYS.MEMBERSHIPS,
          JSON.stringify(sanitizedMemberships),
        );

        localStorage.removeItem(STORAGE_KEYS.TENANT);
        setTenant(null);

        const storedPreferredMembership =
          localStorage.getItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);
        const defaultMembership =
          sanitizedMemberships.find(
            (membership) => membership.id === storedPreferredMembership,
          ) ||
          sanitizedMemberships.find((membership) => membership.isDefault) ||
          sanitizedMemberships[0] ||
          null;

        return {
          success: true,
          user: userData,
          memberships: sanitizedMemberships,
          requiresTenantSelection: sanitizedMemberships.length > 0,
          defaultMembershipId: defaultMembership?.id || null,
        };
      }

      if (tenantData) {
        const normalizedTenant = normalizeTenant(tenantData);
        localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(normalizedTenant));
        setTenant(normalizedTenant);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TENANT);
        setTenant(null);
      }

      setMemberships([]);
      localStorage.removeItem(STORAGE_KEYS.MEMBERSHIPS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);

      return { success: true, user: userData, tenant: tenantData };
    } catch (error) {
      console.error('Login failed:', error);
      clearStoredSession();
      throw error;
    }
  };

  const selectTenant = async (
    membershipId,
    { rememberAsDefault = false } = {},
  ) => {
    try {
      setIsSwitchingTenant(true);
      const response = await switchTenantApi(membershipId, {
        rememberAsDefault,
      });

      const {
        accessToken,
        refreshToken,
        user: userData,
        tenant: tenantData,
        membership,
        memberships: updatedMemberships,
      } = response.data;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      const normalizedTenant = normalizeTenant(tenantData);
      localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(normalizedTenant));
      localStorage.setItem(
        STORAGE_KEYS.ACTIVE_MEMBERSHIP,
        membership?.id || membershipId,
      );

      if (Array.isArray(updatedMemberships)) {
        setMemberships(updatedMemberships);
        localStorage.setItem(
          STORAGE_KEYS.MEMBERSHIPS,
          JSON.stringify(updatedMemberships),
        );
      }

      setToken(accessToken);
      setUser(userData);
      setTenant(normalizedTenant);
      setActiveMembershipId(membership?.id || membershipId);
      setIsAuthenticated(true);

      return {
        user: userData,
        tenant: normalizedTenant,
        membership,
      };
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    } finally {
      setIsSwitchingTenant(false);
    }
  };

  const loginWithTokens = async (data) => {
    try {
      const {
        accessToken,
        refreshToken,
        user: userData,
        tenant: tenantData,
        memberships: membershipsData,
        membership: activeMembership,
      } = data;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);

      if (multiTenantEnabled && Array.isArray(membershipsData)) {
        const sanitizedMemberships = membershipsData.filter(Boolean);
        setMemberships(sanitizedMemberships);
        localStorage.setItem(
          STORAGE_KEYS.MEMBERSHIPS,
          JSON.stringify(sanitizedMemberships),
        );

        // Si backend devuelve tenant/membership activa, guardarla.
        if (tenantData && (activeMembership?.id || sanitizedMemberships.length === 1)) {
          const normalizedTenant = normalizeTenant(tenantData);
          localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(normalizedTenant));
          const membershipId =
            activeMembership?.id ||
            sanitizedMemberships.find((m) => m.isDefault)?.id ||
            sanitizedMemberships[0]?.id ||
            null;
          if (membershipId) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP, membershipId);
          }
          setTenant(normalizedTenant);
          setActiveMembershipId(membershipId);
        } else {
          localStorage.removeItem(STORAGE_KEYS.TENANT);
          setTenant(null);
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);
          setActiveMembershipId(null);
        }

        return {
          success: true,
          user: userData,
          memberships: sanitizedMemberships,
          requiresTenantSelection: sanitizedMemberships.length > 0,
        };
      }

      // Fallback for single-tenant or non-membership flows
      if (tenantData) {
        const normalizedTenant = normalizeTenant(tenantData);
        localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(normalizedTenant));
        setTenant(normalizedTenant);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TENANT);
        setTenant(null);
      }

      setMemberships([]);
      localStorage.removeItem(STORAGE_KEYS.MEMBERSHIPS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);

      return { success: true, user: userData, tenant: tenantData };
    } catch (error) {
      console.error('Login with tokens failed:', error);
      clearStoredSession();
      throw error;
    }
  };

  const logout = () => {
    clearStoredSession();
  };

  const updateTenantContext = (partialTenant) => {
    if (!partialTenant) return;
    setTenant((prev) => {
      const nextTenant = { ...(prev || {}), ...partialTenant };
      localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(nextTenant));
      return nextTenant;
    });
  };

  const permissions = useMemo(() => {
    const normalizePerms = (perms) =>
      (perms || [])
        .map((p) => (typeof p === 'string' ? p : p?.name))
        .filter(Boolean);

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return normalizePerms(payload.role?.permissions);
      } catch (error) {
        console.error('Error parsing JWT:', error);
      }
    }

    return normalizePerms(user?.role?.permissions);
  }, [token, user]);

  const hasPermission = (permission) => {
    if (multiTenantEnabled && memberships.length > 0 && !tenant) {
      return false;
    }

    // First check: Does user's role have this permission?
    if (!permissions.includes(permission)) {
      return false;
    }

    // Second check: Does tenant have the required module enabled?
    // Map permission names to module names
    const permissionToModule = {
      // Core modules
      'inventory_read': 'inventory',
      'inventory_create': 'inventory',
      'inventory_update': 'inventory',
      'inventory_delete': 'inventory',
      'orders_read': 'orders',
      'orders_create': 'orders',
      'orders_update': 'orders',
      'orders_delete': 'orders',
      'customers_read': 'customers',
      'customers_create': 'customers',
      'customers_update': 'customers',
      'customers_delete': 'customers',
      'suppliers_read': 'suppliers',
      'suppliers_create': 'suppliers',
      'suppliers_update': 'suppliers',
      'suppliers_delete': 'suppliers',
      'reports_read': 'reports',
      'accounting_read': 'accounting',
      'accounting_create': 'accounting',
      'accounting_update': 'accounting',
      'accounting_delete': 'accounting',
      'payroll_read': 'payroll',
      'payroll_create': 'payroll',
      'payroll_update': 'payroll',
      'payroll_delete': 'payroll',
      'bank_accounts_read': 'bankAccounts',
      'bank_accounts_create': 'bankAccounts',
      'bank_accounts_update': 'bankAccounts',
      'bank_accounts_delete': 'bankAccounts',
      'hr_core_read': 'hrCore',
      'hr_core_create': 'hrCore',
      'hr_core_update': 'hrCore',
      'hr_core_delete': 'hrCore',
      'time_attendance_read': 'timeAndAttendance',
      'time_attendance_create': 'timeAndAttendance',
      'time_attendance_update': 'timeAndAttendance',
      'time_attendance_delete': 'timeAndAttendance',

      // Communication & Marketing
      'chat_read': 'chat',
      'chat_create': 'chat',
      'chat_update': 'chat',
      'chat_delete': 'chat',
      'marketing_read': 'marketing',
      'marketing_create': 'marketing',
      'marketing_update': 'marketing',
      'marketing_delete': 'marketing',

      // Food Service modules
      'restaurant_read': 'restaurant',
      'restaurant_create': 'restaurant',
      'restaurant_update': 'restaurant',
      'restaurant_delete': 'restaurant',
      'tables_read': 'tables',
      'tables_create': 'tables',
      'tables_update': 'tables',
      'tables_delete': 'tables',
      'recipes_read': 'recipes',
      'recipes_create': 'recipes',
      'recipes_update': 'recipes',
      'recipes_delete': 'recipes',
      'kitchen_display_read': 'kitchenDisplay',
      'menu_engineering_read': 'menuEngineering',
      'menu_engineering_create': 'menuEngineering',
      'menu_engineering_update': 'menuEngineering',
      'menu_engineering_delete': 'menuEngineering',
      'tips_read': 'tips',
      'tips_create': 'tips',
      'tips_update': 'tips',
      'tips_delete': 'tips',
      'reservations_read': 'reservations',
      'reservations_create': 'reservations',
      'reservations_update': 'reservations',
      'reservations_delete': 'reservations',

      // Retail modules
      'pos_read': 'pos',
      'pos_create': 'pos',
      'variants_read': 'variants',
      'variants_create': 'variants',
      'variants_update': 'variants',
      'variants_delete': 'variants',
      'ecommerce_read': 'ecommerce',
      'ecommerce_create': 'ecommerce',
      'ecommerce_update': 'ecommerce',
      'ecommerce_delete': 'ecommerce',
      'loyalty_program_read': 'loyaltyProgram',
      'loyalty_program_create': 'loyaltyProgram',
      'loyalty_program_update': 'loyaltyProgram',
      'loyalty_program_delete': 'loyaltyProgram',

      // Logistics modules
      'shipments_read': 'shipments',
      'shipments_create': 'shipments',
      'shipments_update': 'shipments',
      'shipments_delete': 'shipments',
      'tracking_read': 'tracking',
      'tracking_create': 'tracking',
      'tracking_update': 'tracking',
      'tracking_delete': 'tracking',
      'routes_read': 'routes',
      'routes_create': 'routes',
      'routes_update': 'routes',
      'routes_delete': 'routes',
      'fleet_read': 'fleet',
      'fleet_create': 'fleet',
      'fleet_update': 'fleet',
      'fleet_delete': 'fleet',
      'warehousing_read': 'warehousing',
      'warehousing_create': 'warehousing',
      'warehousing_update': 'warehousing',
      'warehousing_delete': 'warehousing',
      'dispatch_read': 'dispatch',
      'dispatch_create': 'dispatch',
      'dispatch_update': 'dispatch',
      'dispatch_delete': 'dispatch',

      // Services modules
      'appointments_read': 'appointments',
      'appointments_create': 'appointments',
      'appointments_update': 'appointments',
      'appointments_delete': 'appointments',
      'resources_read': 'resources',
      'resources_create': 'resources',
      'resources_update': 'resources',
      'resources_delete': 'resources',
      'booking_read': 'booking',
      'booking_create': 'booking',
      'booking_update': 'booking',
      'booking_delete': 'booking',
      'service_packages_read': 'servicePackages',
      'service_packages_create': 'servicePackages',
      'service_packages_update': 'servicePackages',
      'service_packages_delete': 'servicePackages',
    };

    const requiredModule = permissionToModule[permission];

    // If permission doesn't map to a module (e.g., dashboard_read, settings_read),
    // only check role permission
    if (!requiredModule) {
      return true;
    }

    // Check if tenant has the required module enabled
    return Boolean(tenant?.enabledModules?.[requiredModule]);
  };

  const saveLastLocation = (path) => {
    // Only save locations that are not login/auth related
    // Organizations page is now saved so user stays there on refresh
    if (path && !path.includes('/login') && !path.includes('/register') && !path.includes('/forgot-password') && !path.includes('/reset-password') && !path.includes('/auth/callback')) {
      localStorage.setItem(STORAGE_KEYS.LAST_LOCATION, path);
    }
  };

  const getLastLocation = () => {
    const lastLocation = localStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
    // Return last location or default to dashboard
    return lastLocation || '/dashboard';
  };

  const clearLastLocation = () => {
    localStorage.removeItem(STORAGE_KEYS.LAST_LOCATION);
  };

  const value = useMemo(() => ({
    user,
    tenant,
    tenantConfirmed: tenant ? tenant.isConfirmed !== false : true,
    token,
    memberships,
    activeMembershipId,
    isSwitchingTenant,
    isAuthenticated,
    isMultiTenantEnabled: multiTenantEnabled,
    login,
    selectTenant,
    logout,
    loginWithTokens,
    updateTenantContext,
    permissions,
    hasPermission,
    saveLastLocation,
    getLastLocation,
    clearLastLocation,
    refreshSession,
  }), [
    user,
    tenant,
    token,
    memberships,
    activeMembershipId,
    isSwitchingTenant,
    isAuthenticated,
    multiTenantEnabled,
    permissions,
  ]);

  useEffect(() => {
    // Inicialización ahora en useState
  }, []);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

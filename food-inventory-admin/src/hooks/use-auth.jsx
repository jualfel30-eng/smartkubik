import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  fetchApi,
  switchTenant as switchTenantApi,
} from '../lib/api';
import { isFeatureEnabled } from '../config/features';
import { toast } from 'sonner';
import { createScopedLogger } from '@/lib/logger';

const logger = createScopedLogger('auth-context');

const AuthContext = createContext(null);

const STORAGE_KEYS = {
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
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activeMembershipId, setActiveMembershipId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);
  const hasAuthenticatedSessionRef = useRef(false);
  const sessionExpiryToastShownRef = useRef(false);
  const manualLogoutRef = useRef(false);

  const resetState = useCallback(() => {
    setUser(null);
    setTenant(null);
    setMemberships([]);
    setActiveMembershipId(null);
    setIsAuthenticated(false);
  }, []);

  const applySessionPayload = useCallback(
    (payload = {}) => {
      const userData = payload?.user ?? null;
      const tenantData = payload?.tenant ?? null;
      const membership = payload?.membership ?? null;
      const membershipList = Array.isArray(payload?.memberships)
        ? payload.memberships.filter(Boolean)
        : [];

      setUser(userData);
      setIsAuthenticated(Boolean(userData));
      hasAuthenticatedSessionRef.current = Boolean(userData);
      sessionExpiryToastShownRef.current = false;
      manualLogoutRef.current = false;

      const normalizedTenant = tenantData ? normalizeTenant(tenantData) : null;

      if (multiTenantEnabled) {
        setMemberships(membershipList);
        setTenant(normalizedTenant);

        const nextMembershipId =
          membership?.id ||
          membershipList.find((item) => item.id === activeMembershipId)?.id ||
          membershipList.find((item) => item.isDefault)?.id ||
          membershipList[0]?.id ||
          null;

        setActiveMembershipId(nextMembershipId);

        return {
          user: userData,
          tenant: normalizedTenant,
          memberships: membershipList,
          membership: membership ?? null,
          activeMembershipId: nextMembershipId,
        };
      }

      setMemberships([]);
      setActiveMembershipId(membership?.id ?? null);
      setTenant(normalizedTenant);

      return {
        user: userData,
        tenant: normalizedTenant,
        memberships: [],
        membership: membership ?? null,
        activeMembershipId: membership?.id ?? null,
      };
    },
    [multiTenantEnabled, activeMembershipId],
  );

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetchApi('/auth/session');
      if (response?.data) {
        return applySessionPayload(response.data);
      }
      hasAuthenticatedSessionRef.current = false;
      sessionExpiryToastShownRef.current = false;
      manualLogoutRef.current = false;
      resetState();
      return null;
    } catch (error) {
      const status = Number.isFinite(error?.status) ? Number(error.status) : null;
      const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
      const isUnauthorized =
        status === 401 ||
        status === 403 ||
        message.includes('unauthorized') ||
        message.includes('forbidden');
      if (!isUnauthorized) {
        logger.warn('Failed to bootstrap auth session', { error: error?.message ?? error });
      }
      resetState();
      if (
        isUnauthorized &&
        hasAuthenticatedSessionRef.current &&
        !sessionExpiryToastShownRef.current &&
        !manualLogoutRef.current
      ) {
        sessionExpiryToastShownRef.current = true;
        hasAuthenticatedSessionRef.current = false;
        toast.error('Tu sesión expiró', {
          description: 'Vuelve a iniciar sesión para continuar.',
        });
      }
      return null;
    } finally {
      setIsBootstrapping(false);
    }
  }, [applySessionPayload, resetState]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleUnauthorized = (event) => {
      const detail = event?.detail ?? {};
      const status = Number.isFinite(detail?.status) ? Number(detail.status) : null;
      const message =
        typeof detail?.message === 'string' ? detail.message.toLowerCase() : '';
      const isUnauthorized =
        status === 401 ||
        status === 403 ||
        message.includes('unauthorized') ||
        message.includes('forbidden');

      if (
        !isUnauthorized ||
        sessionExpiryToastShownRef.current ||
        !hasAuthenticatedSessionRef.current ||
        manualLogoutRef.current
      ) {
        return;
      }

      sessionExpiryToastShownRef.current = true;
      hasAuthenticatedSessionRef.current = false;
      resetState();
      toast.error('Tu sesión expiró', {
        description: 'Vuelve a iniciar sesión para continuar.',
      });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [resetState]);

  const login = async (email, password, tenantCode) => {
    try {
      const response = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, tenantCode }),
      });

      const {
        user: userData,
        tenant: tenantData,
        memberships: membershipsData,
      } = response.data;
      const sessionSnapshot = applySessionPayload({
        user: userData,
        tenant: tenantData,
        memberships: membershipsData,
        membership: response.data.membership ?? null,
      });

      const requiresTenantSelection =
        multiTenantEnabled &&
        Array.isArray(sessionSnapshot.memberships) &&
        sessionSnapshot.memberships.length > 0 &&
        !sessionSnapshot.tenant;

      return {
        success: true,
        user: sessionSnapshot.user,
        tenant: sessionSnapshot.tenant,
        memberships: sessionSnapshot.memberships,
        membership: sessionSnapshot.membership,
        requiresTenantSelection,
        defaultMembershipId: sessionSnapshot.activeMembershipId ?? null,
      };
    } catch (error) {
      logger.error('Login failed', { error: error?.message ?? error });
      resetState();
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
        user: userData,
        tenant: tenantData,
        membership,
        memberships: updatedMemberships,
      } = response.data;
      const snapshot = applySessionPayload({
        user: userData,
        tenant: tenantData,
        memberships: updatedMemberships,
        membership: membership ?? null,
      });

      return {
        user: snapshot.user,
        tenant: snapshot.tenant,
        membership: snapshot.membership,
      };
    } catch (error) {
      logger.error('Failed to switch tenant', { error: error?.message ?? error });
      throw error;
    } finally {
      setIsSwitchingTenant(false);
    }
  };

  const loginWithTokens = async (payload) => {
    try {
      const data = payload?.data ?? payload;

      if (!data || typeof data !== 'object') {
        throw new Error('No se recibió información de autenticación.');
      }

      const {
        user: userData,
        tenant: tenantData,
        memberships: membershipsData,
        membership,
      } = data;

      if (!userData) {
        throw new Error('No se pudo recuperar el usuario autenticado.');
      }
      const snapshot = applySessionPayload({
        user: userData,
        tenant: tenantData,
        memberships: membershipsData,
        membership: membership ?? null,
      });

      const requiresTenantSelection =
        multiTenantEnabled &&
        Array.isArray(snapshot.memberships) &&
        snapshot.memberships.length > 0 &&
        !snapshot.tenant;

      return {
        success: true,
        user: snapshot.user,
        tenant: snapshot.tenant,
        membership: snapshot.membership,
        memberships: snapshot.memberships,
        requiresTenantSelection,
      };
    } catch (error) {
      logger.error('Login with tokens failed', { error: error?.message ?? error });
      resetState();
      throw error;
    }
  };

  const logout = async () => {
    manualLogoutRef.current = true;
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (error) {
      logger.error('Logout request failed', { error: error?.message ?? error });
    } finally {
      resetState();
      hasAuthenticatedSessionRef.current = false;
      sessionExpiryToastShownRef.current = false;
      manualLogoutRef.current = false;
    }
  };

  const updateTenantContext = (partialTenant) => {
    if (!partialTenant) return;
    setTenant((prev) => {
      const nextTenant = { ...(prev || {}), ...partialTenant };
      return nextTenant;
    });
  };

  const permissions = useMemo(() => {
    if (multiTenantEnabled && memberships.length > 0) {
      const activeMembership =
        memberships.find((membership) => membership.id === activeMembershipId) ||
        memberships.find((membership) => membership.isDefault) ||
        memberships[0];

      if (activeMembership?.permissions) {
        return activeMembership.permissions;
      }
    }

    if (user?.role?.permissions) {
      if (Array.isArray(user.role.permissions)) {
        return user.role.permissions
          .map((permission) => {
            if (!permission) return null;
            if (typeof permission === 'string') return permission;
            return permission.name || null;
          })
          .filter(Boolean);
      }
    }

    return [];
  }, [multiTenantEnabled, memberships, activeMembershipId, user]);

  const hasPermission = (permission) => {
    if (multiTenantEnabled && memberships.length > 0 && !tenant) {
      return false;
    }
    return permissions.includes(permission);
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

  const value = {
    user,
    tenant,
    tenantConfirmed: tenant ? tenant.isConfirmed !== false : true,
    memberships,
    activeMembershipId,
    isSwitchingTenant,
    isAuthenticated,
    isBootstrapping,
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
    refreshSession: fetchSession,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  fetchApi,
  getProfile,
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
};

export const AuthProvider = ({ children }) => {
  const multiTenantEnabled = isFeatureEnabled('MULTI_TENANT_LOGIN');
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
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

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const storedTenant = localStorage.getItem(STORAGE_KEYS.TENANT);

    if (storedToken && storedUser && storedUser !== 'undefined') {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setIsAuthenticated(true);

        if (storedTenant && storedTenant !== 'undefined') {
          setTenant(JSON.parse(storedTenant));
        } else if (multiTenantEnabled) {
          setTenant(null);
        }
      } catch (error) {
        console.error('Failed to parse stored auth data:', error);
        clearStoredSession();
      }
    }

    const storedMemberships = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
    if (storedMemberships && storedMemberships !== 'undefined') {
      try {
        const parsedMemberships = JSON.parse(storedMemberships);
        if (Array.isArray(parsedMemberships)) {
          setMemberships(parsedMemberships);
        }
      } catch (error) {
        console.error('Failed to parse stored memberships:', error);
        localStorage.removeItem(STORAGE_KEYS.MEMBERSHIPS);
      }
    }
  }, [multiTenantEnabled]);

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
        localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenantData));
        setTenant(tenantData);
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
      localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenantData));
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
      setTenant(tenantData);
      setActiveMembershipId(membership?.id || membershipId);
      setIsAuthenticated(true);

      return {
        user: userData,
        tenant: tenantData,
        membership,
      };
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    } finally {
      setIsSwitchingTenant(false);
    }
  };

  const loginWithTokens = async (accessToken, refreshToken) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      setToken(accessToken);

      const profileResponse = await getProfile();
      const profileData = profileResponse?.data || profileResponse;

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profileData));
      setUser(profileData);

      const tenantInfo = profileData?.tenant || profileData?.tenantId;
      if (tenantInfo) {
        const normalizedTenant = {
          id: tenantInfo.id || tenantInfo._id,
          code: tenantInfo.code,
          name: tenantInfo.name,
          businessType: tenantInfo.businessType,
          vertical: tenantInfo.vertical,
          enabledModules: tenantInfo.enabledModules,
        };
        localStorage.setItem(
          STORAGE_KEYS.TENANT,
          JSON.stringify(normalizedTenant),
        );
        setTenant(normalizedTenant);
      } else if (multiTenantEnabled) {
        setTenant(null);
      }

      setMemberships([]);
      localStorage.removeItem(STORAGE_KEYS.MEMBERSHIPS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP);

      setIsAuthenticated(true);
      return profileData;
    } catch (error) {
      console.error('Login with tokens failed:', error);
      clearStoredSession();
      return null;
    }
  };

  const logout = () => {
    clearStoredSession();
  };

  const permissions = useMemo(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role?.permissions || [];
      } catch (error) {
        console.error('Error parsing JWT:', error);
      }
    }

    return user?.role?.permissions || [];
  }, [token, user]);

  const hasPermission = (permission) => {
    if (multiTenantEnabled && memberships.length > 0 && !tenant) {
      return false;
    }
    return permissions.includes(permission);
  };

  const value = {
    user,
    tenant,
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
    permissions,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

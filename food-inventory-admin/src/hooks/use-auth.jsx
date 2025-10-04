import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { fetchApi, getProfile } from '../lib/api'; // Import getProfile

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');
    if (storedToken && storedUser && storedUser !== 'undefined') {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setIsAuthenticated(true);
        if (storedTenant && storedTenant !== 'undefined') {
          setTenant(JSON.parse(storedTenant));
        }
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        // Clear corrupted data if parsing fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
      }
    }
  }, []);

  const login = async (email, password, tenantCode) => {
    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, tenantCode }),
      });

      const { accessToken, refreshToken, user: userData, tenant: tenantData } = data.data;
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(userData));
      if (tenantData) {
        localStorage.setItem('tenant', JSON.stringify(tenantData));
        setTenant(tenantData);
      }
      setToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData, tenant: tenantData };
    } catch (error) {
      console.error('Login failed:', error);
      logout(); // Ensure clean state on failure
      throw error;
    }
  };

  const loginWithTokens = async (accessToken, refreshToken) => {
    try {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setToken(accessToken);
      
      // Fetch user profile
      const userData = await getProfile();
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      return userData; // Return user data on success
    } catch (error) {
      console.error('Login with tokens failed:', error);
      logout(); // Ensure clean state on failure
      return null; // Return null on failure
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setToken(null);
    setUser(null);
    setTenant(null);
    setIsAuthenticated(false);
  };

  const permissions = useMemo(() => {
    // Si tenemos token, extraer permisos del JWT
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role?.permissions || [];
      } catch (e) {
        console.error('Error parsing JWT:', e);
      }
    }
    // Fallback a permisos del user (aunque sean ObjectIds)
    return user?.role?.permissions || [];
  }, [token, user]);

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const value = {
    user,
    tenant,
    token,
    isAuthenticated,
    login,
    logout,
    loginWithTokens, // Expose the new function
    permissions,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
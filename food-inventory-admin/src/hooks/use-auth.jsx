import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getProfile, fetchApi } from '../lib/api'; // Import fetchApi

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        setToken(storedToken);
        const { data: profileResponse, error } = await getProfile();
        if (profileResponse && profileResponse.data) {
          setUser(profileResponse.data);
          setIsAuthenticated(true);
        } else {
          // Token is invalid or expired
          console.error('Failed to fetch profile with stored token:', error);
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email, password, tenantCode) => {
    const { data, error } = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenantCode }),
    });

    if (error) {
      console.error('Login failed:', error);
      logout(); // Ensure clean state on failure
      return { success: false, message: error };
    }

    if (data && data.data) {
      // 1. Set tokens from login response
      const { accessToken, refreshToken } = data.data;
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setToken(accessToken);

      // 2. Fetch the full user profile to get roles/permissions
      const { data: profileResponse, error: profileError } = await getProfile();
      if (profileError || !profileResponse.data) {
        console.error('Failed to fetch profile after login:', profileError || 'Profile data is empty');
        logout(); // Clean up if profile fetch fails
        return { success: false, message: profileError || 'Profile data is empty' };
      }

      // 3. Set the full user object and finalize authentication
      const profileData = profileResponse.data;
      localStorage.setItem('user', JSON.stringify(profileData));
      setUser(profileData);
      setIsAuthenticated(true);
    }


    return { success: true };
  };

  const loginWithTokens = async (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    setToken(accessToken);

    const { data: profileResponse, error } = await getProfile();

    if (error || !profileResponse.data) {
      console.error('Login with tokens failed:', error || 'Profile data is empty');
      logout(); // Ensure clean state on failure
      return;
    }

    const userData = profileResponse.data;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const permissions = useMemo(() => user?.role?.permissions || [], [user]);

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading, // Expose loading state
    login,
    logout,
    loginWithTokens,
    permissions,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
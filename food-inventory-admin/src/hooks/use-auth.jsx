import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { fetchApi, getProfile } from '../lib/api'; // Import getProfile

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser && storedUser !== 'undefined') {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        // Clear corrupted data if parsing fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email, password, tenantCode) => {
    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, tenantCode }),
      });

      const { accessToken, refreshToken, user: userData } = data.data;
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
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
    } catch (error) {
      console.error('Login with tokens failed:', error);
      logout(); // Ensure clean state on failure
    }
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
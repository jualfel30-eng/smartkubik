import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getProfile } from '../lib/api'; // Import getProfile

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email, password, tenantCode) => {
    try {
      const response = await fetch('http://[::1]:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, tenantCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error en el login');
      }

      const { accessToken, refreshToken, user: userData } = data.data;
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      logout(); // Ensure clean state on failure
      return { success: false, message: error.message };
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
      const profileResponse = await getProfile();
      if (profileResponse.success) {
        const userData = profileResponse.data;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        throw new Error(profileResponse.message || 'Could not fetch profile');
      }
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
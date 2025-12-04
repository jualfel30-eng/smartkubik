'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  Customer,
  RegisterCustomerDto,
  LoginCustomerDto,
  UpdateCustomerProfileDto,
  ChangePasswordDto,
} from '@/types';
import {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
} from '@/lib/api';

interface AuthContextType {
  customer: Customer | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginCustomerDto, tenantId: string) => Promise<void>;
  register: (data: RegisterCustomerDto, tenantId: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateCustomerProfileDto, tenantId: string) => Promise<void>;
  changePassword: (data: ChangePasswordDto, tenantId: string) => Promise<void>;
  refreshProfile: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'customer_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar token y perfil al iniciar
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);

        if (storedToken) {
          setToken(storedToken);
          // Intentar cargar el perfil del usuario
          // Nota: necesitamos el tenantId, lo obtendremos del token o del contexto
          // Por ahora, solo establecemos el token
        }
      } catch (error) {
        console.error('Error loading auth:', error);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const login = useCallback(async (data: LoginCustomerDto, tenantId: string) => {
    try {
      setIsLoading(true);
      const response = await loginCustomer(data, tenantId);

      setToken(response.token);
      setCustomer(response.customer);
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterCustomerDto, tenantId: string) => {
    try {
      setIsLoading(true);
      const response = await registerCustomer(data, tenantId);

      setToken(response.token);
      setCustomer(response.customer);
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setCustomer(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }, []);

  const refreshProfile = useCallback(async (tenantId: string) => {
    if (!token) return;

    try {
      const profile = await getCustomerProfile(token, tenantId);
      setCustomer(profile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      // Si el token expiró, cerrar sesión
      if (error instanceof Error && error.message.includes('expirada')) {
        logout();
      }
      throw error;
    }
  }, [token, logout]);

  const updateProfile = useCallback(
    async (data: UpdateCustomerProfileDto, tenantId: string) => {
      if (!token) throw new Error('No autenticado');

      try {
        const updatedCustomer = await updateCustomerProfile(token, tenantId, data);
        setCustomer(updatedCustomer);
      } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
    },
    [token]
  );

  const changePassword = useCallback(
    async (data: ChangePasswordDto, tenantId: string) => {
      if (!token) throw new Error('No autenticado');

      try {
        await changeCustomerPassword(token, tenantId, data);
      } catch (error) {
        console.error('Error changing password:', error);
        throw error;
      }
    },
    [token]
  );

  const isAuthenticated = !!token && !!customer;

  return (
    <AuthContext.Provider
      value={{
        customer,
        token,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

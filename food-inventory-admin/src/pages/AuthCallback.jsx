import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { fetchApi } from '../lib/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const sessionResponse = await fetchApi('/auth/session');
        const authResult = await loginWithTokens(sessionResponse);
        const sessionData = sessionResponse?.data ?? sessionResponse;
        const user = sessionData?.user || authResult?.user;

        if (authResult?.requiresTenantSelection) {
          navigate('/organizations');
          return;
        }

        if (user?.role?.name === 'super_admin') {
          navigate('/super-admin');
          return;
        }

        navigate('/dashboard');
      } catch (error) {
        console.error('Google Auth Error:', error);
        navigate('/login', { state: { error: 'Error de autenticación con Google.' } });
      }
    };

    handleAuth();
  }, [navigate, loginWithTokens]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Autenticando, por favor espere...</p>
    </div>
  );
};

export default AuthCallback;

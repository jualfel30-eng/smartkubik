import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    const handleAuth = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');

      if (accessToken && refreshToken) {
        const response = await loginWithTokens(accessToken, refreshToken);
        const user = response?.data; // The actual user object is in the 'data' property
        
        if (user && user.role?.name === 'super_admin') {
          navigate('/super-admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Handle error: No tokens found in URL
        console.error("Google Auth Error: No tokens provided in callback.");
        navigate('/login', { state: { error: 'Error de autenticación con Google.' } });
      }
    };

    handleAuth();
  }, [searchParams, navigate, loginWithTokens]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Autenticando, por favor espere...</p>
    </div>
  );
};

export default AuthCallback;

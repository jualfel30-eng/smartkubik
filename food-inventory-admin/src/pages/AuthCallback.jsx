import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      loginWithTokens(accessToken, refreshToken);
      navigate('/');
    } else {
      // Handle error: No tokens found in URL
      console.error("Google Auth Error: No tokens provided in callback.");
      navigate('/login', { state: { error: 'Error de autenticación con Google.' } });
    }
  }, [searchParams, navigate, loginWithTokens]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Autenticando, por favor espere...</p>
    </div>
  );
};

export default AuthCallback;

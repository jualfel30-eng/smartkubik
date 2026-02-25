import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth.jsx';

const ProtectedRoute = ({ children, requireOrganization = false }) => {
  const { isAuthenticated, tenant, memberships } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute] Checking access for:', location.pathname);
  console.log('[ProtectedRoute] isAuthenticated:', isAuthenticated);
  console.log('[ProtectedRoute] requireOrganization:', requireOrganization);
  console.log('[ProtectedRoute] Has tenant:', !!tenant);
  console.log('[ProtectedRoute] Tenant:', tenant);
  console.log('[ProtectedRoute] Memberships count:', memberships?.length || 0);

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] ❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere organización seleccionada
  if (requireOrganization) {
    // Si no tiene tenant seleccionado, redirigir al selector de organizaciones
    // Guardamos la ubicación actual en el state para que OrganizationSelector pueda redirigir de vuelta
    if (!tenant) {
      console.log('[ProtectedRoute] ❌ No tenant, redirecting to /organizations from:', location.pathname);
      return <Navigate to="/organizations" replace state={{ from: location.pathname }} />;
    }

    // Si no tiene memberships, también redirigir al selector
    if (!memberships || memberships.length === 0) {
      console.log('[ProtectedRoute] ❌ No memberships, redirecting to /organizations');
      return <Navigate to="/organizations" replace state={{ from: location.pathname }} />;
    }

    // Si el onboarding no está completo, redirigir al wizard
    if (tenant && !tenant.onboardingCompleted && location.pathname !== '/onboarding') {
      console.log('[ProtectedRoute] ➡️ Onboarding not completed, redirecting to /onboarding');
      return <Navigate to="/onboarding" replace />;
    }
  }

  console.log('[ProtectedRoute] ✅ Access granted');
  return children;
};

export default ProtectedRoute;

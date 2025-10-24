import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth.jsx';

const ProtectedRoute = ({ children, requireOrganization = false }) => {
  const { isAuthenticated, tenant, memberships } = useAuth();
  const location = useLocation();

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere organización seleccionada
  if (requireOrganization) {
    // Si no tiene tenant seleccionado, redirigir al selector de organizaciones
    // Guardamos la ubicación actual en el state para que OrganizationSelector pueda redirigir de vuelta
    if (!tenant) {
      return <Navigate to="/organizations" replace state={{ from: location.pathname }} />;
    }

    // Si no tiene memberships, también redirigir al selector
    if (!memberships || memberships.length === 0) {
      return <Navigate to="/organizations" replace state={{ from: location.pathname }} />;
    }
  }

  return children;
};

export default ProtectedRoute;

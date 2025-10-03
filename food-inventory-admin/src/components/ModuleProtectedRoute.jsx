import { useModuleAccess, useVertical } from '../hooks/useModuleAccess';
import ModuleAccessDenied from './ModuleAccessDenied';

/**
 * Higher Order Component to protect routes based on module access
 *
 * @param {React.Component} Component - Component to render if access is granted
 * @param {string} requiredModule - Module name required to access this route
 * @returns {React.Component} - Protected component or access denied screen
 *
 * @example
 * // In your router configuration:
 * {
 *   path: '/tables',
 *   element: <ModuleProtectedRoute component={TablesManagement} requiredModule="tables" />
 * }
 */
export default function ModuleProtectedRoute({ component: Component, requiredModule }) {
  const hasAccess = useModuleAccess(requiredModule);
  const vertical = useVertical();

  if (!hasAccess) {
    return <ModuleAccessDenied moduleName={requiredModule} vertical={vertical} />;
  }

  return <Component />;
}

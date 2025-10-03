import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook to check if a specific module is enabled for the current tenant
 *
 * @param {string} moduleName - Name of the module to check (e.g., 'tables', 'recipes', 'pos')
 * @returns {boolean} - True if module is enabled, false otherwise
 *
 * @example
 * const TablesPage = () => {
 *   const hasTablesAccess = useModuleAccess('tables');
 *
 *   if (!hasTablesAccess) {
 *     return <AccessDenied module="tables" />;
 *   }
 *
 *   return <TablesManagement />;
 * };
 */
export const useModuleAccess = (moduleName) => {
  const { tenant } = useContext(AuthContext);

  if (!tenant || !tenant.enabledModules) {
    // If no tenant or no enabledModules, deny access by default
    return false;
  }

  // Check if the module is explicitly enabled
  return tenant.enabledModules[moduleName] === true;
};

/**
 * Hook to check if ANY of the specified modules is enabled
 *
 * @param {string[]} moduleNames - Array of module names
 * @returns {boolean} - True if at least one module is enabled
 *
 * @example
 * const hasFoodServiceFeatures = useAnyModuleAccess(['tables', 'recipes', 'kitchenDisplay']);
 */
export const useAnyModuleAccess = (moduleNames) => {
  const { tenant } = useContext(AuthContext);

  if (!tenant || !tenant.enabledModules) {
    return false;
  }

  return moduleNames.some(moduleName => tenant.enabledModules[moduleName] === true);
};

/**
 * Hook to check if ALL of the specified modules are enabled
 *
 * @param {string[]} moduleNames - Array of module names
 * @returns {boolean} - True if all modules are enabled
 *
 * @example
 * const hasCompleteRetailSuite = useAllModulesAccess(['pos', 'variants', 'ecommerce']);
 */
export const useAllModulesAccess = (moduleNames) => {
  const { tenant } = useContext(AuthContext);

  if (!tenant || !tenant.enabledModules) {
    return false;
  }

  return moduleNames.every(moduleName => tenant.enabledModules[moduleName] === true);
};

/**
 * Hook to get the tenant's vertical
 *
 * @returns {string} - Vertical name (e.g., 'FOOD_SERVICE', 'RETAIL', 'LOGISTICS')
 */
export const useVertical = () => {
  const { tenant } = useContext(AuthContext);
  return tenant?.vertical || 'FOOD_SERVICE';
};
